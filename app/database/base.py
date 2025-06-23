from typing import List, Dict, Optional, Tuple

from app.database.connection import DB

class SQLiteBase:
    def __init__(self, table_name: str):
        self.table_name = table_name
    
    async def insert_one(self, document: Dict) -> Optional[int]:
        """
        Insert a single document into the database.
        
        Args:
            document: Document to insert
            
        Returns:
            The document ID if successful, None otherwise
        """
        try:
            db = await DB.get_db()
            
            # Get column names and values
            columns = list(document.keys())
            values = list(document.values())
            
            # Build the SQL query
            placeholders = ", ".join(["?"] * len(columns))
            column_str = ", ".join(columns)
            
            query = f"INSERT INTO {self.table_name} ({column_str}) VALUES ({placeholders})"
            
            async with db.cursor() as cursor:
                await cursor.execute(query, values)
                await db.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error inserting document: {e}")
            return None
        
    async def insert_many(self, documents: List[Dict]) -> bool:
        """
        Insert multiple documents into the database.
        
        Args:
            documents: List of documents to insert
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not documents:
                return False
                
            db = await DB.get_db()
            
            # Get column names from the first document
            columns = list(documents[0].keys())
            
            # Build the SQL query
            placeholders = ", ".join(["?"] * len(columns))
            column_str = ", ".join(columns)
            
            query = f"INSERT INTO {self.table_name} ({column_str}) VALUES ({placeholders})"
            
            # Prepare values for each document
            values_list = []
            for document in documents:
                values = []
                for column in columns:
                    values.append(document.get(column))
                values_list.append(values)
            
            async with db.cursor() as cursor:
                await cursor.executemany(query, values_list)
                await db.commit()
                return True
        except Exception as e:
            print(f"Error inserting documents: {e}")
            return False
    
    async def find_one(
        self, query: Dict = None, projection: Dict = None
    ) -> Optional[Dict]:
        """
        Find a single document matching the query.
        
        Args:
            query: Query to match
            projection: Fields to include/exclude
            
        Returns:
            Matching document or None
        """
        try:
            db = await DB.get_db()
            
            # Build SQL WHERE clause and parameters
            where_clause, params = self._build_where_clause(query)
            
            # Build projection
            select_clause = self._build_select_clause(projection)
            
            # Build final query
            sql_query = f"SELECT {select_clause} FROM {self.table_name}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            sql_query += " LIMIT 1"
            
            async with db.execute(sql_query, params) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                    
                return dict(row)
        except Exception as e:
            print(f"Error finding document: {e}")
            return None
    
    async def find_many(
        self,
        query: Dict = None,
        projection: Dict = None,
        sort: List[Tuple[str, int]] = None,
        limit: int = None,
    ) -> List[Dict]:
        """
        Find multiple documents matching the query.
        
        Args:
            query: Query to match
            projection: Fields to include/exclude
            sort: List of (field, direction) tuples to sort by
            limit: Maximum number of documents to return
            
        Returns:
            List of matching documents
        """
        try:
            db = await DB.get_db()
            
            # Build SQL WHERE clause and parameters
            where_clause, params = self._build_where_clause(query)
            
            # Build projection
            select_clause = self._build_select_clause(projection)
            
            # Build ORDER BY clause
            order_clause = self._build_order_clause(sort)
            
            # Build final query
            sql_query = f"SELECT {select_clause} FROM {self.table_name}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            if order_clause:
                sql_query += f" ORDER BY {order_clause}"
            if limit is not None:
                sql_query += f" LIMIT {limit}"
            
            async with db.execute(sql_query, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error finding documents: {e}")
            return []
    
    async def update_one(self, query: Dict, update: Dict, upsert: bool = False) -> bool:
        """
        Update a single document matching the query.
        
        Args:
            query: Query to match
            update: Update to apply
            upsert: Whether to insert if no match is found
            
        Returns:
            True if a document was updated, False otherwise
        """
        try:
            db = await DB.get_db()
            
            # Handle $set operation
            if "$set" in update:
                updates = update["$set"]
            else:
                updates = update
                
            # Build SET clause and parameters
            set_parts = []
            set_params = []
            
            for key, value in updates.items():
                set_parts.append(f"{key} = ?")
                set_params.append(value)
                
            set_clause = ", ".join(set_parts)
            
            # Build WHERE clause and parameters
            where_clause, where_params = self._build_where_clause(query)
            
            # Combine parameters
            params = set_params + where_params
            
            # Build final query
            sql_query = f"UPDATE {self.table_name} SET {set_clause}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            
            async with db.cursor() as cursor:
                await cursor.execute(sql_query, params)
                updated_count = cursor.rowcount
                await db.commit()
                
                if updated_count > 0:
                    return True
                
                # Handle upsert
                if upsert:
                    # Create a new document by combining query and update
                    if "$set" in update:
                        new_doc = {**query, **update["$set"]}
                    else:
                        new_doc = {**query, **update}
                        
                    await self.insert_one(new_doc)
                    return True
                    
                return False
        except Exception as e:
            print(f"Error updating document: {e}")
            return False
    
    async def update_many(self, query: Dict, update: Dict, upsert: bool = False) -> int:
        """
        Update multiple documents matching the query.
        
        Args:
            query: Query to match
            update: Update to apply
            upsert: Whether to insert if no match is found
            
        Returns:
            Number of documents updated
        """
        try:
            db = await DB.get_db()
            
            # Handle $set operation
            if "$set" in update:
                updates = update["$set"]
            else:
                updates = update
                
            # Build SET clause and parameters
            set_parts = []
            set_params = []
            
            for key, value in updates.items():
                set_parts.append(f"{key} = ?")
                set_params.append(value)
                
            set_clause = ", ".join(set_parts)
            
            # Build WHERE clause and parameters
            where_clause, where_params = self._build_where_clause(query)
            
            # Combine parameters
            params = set_params + where_params
            
            # Build final query
            sql_query = f"UPDATE {self.table_name} SET {set_clause}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            
            async with db.cursor() as cursor:
                await cursor.execute(sql_query, params)
                updated_count = cursor.rowcount
                await db.commit()
                
                if updated_count == 0 and upsert:
                    # Create a new document by combining query and update
                    if "$set" in update:
                        new_doc = {**query, **update["$set"]}
                    else:
                        new_doc = {**query, **update}
                        
                    await self.insert_one(new_doc)
                    return 1
                    
                return updated_count
        except Exception as e:
            print(f"Error updating documents: {e}")
            return 0
    
    async def delete_one(self, query: Dict) -> bool:
        """
        Delete a single document matching the query.
        
        Args:
            query: Query to match
            
        Returns:
            True if a document was deleted, False otherwise
        """
        try:
            db = await DB.get_db()
            
            where_clause, params = self._build_where_clause(query)
            
            select_query = f"SELECT rowid FROM {self.table_name}"
            if where_clause:
                select_query += f" WHERE {where_clause}"
            select_query += " LIMIT 1"
            
            rowid = None
            async with db.execute(select_query, params) as cursor:
                row = await cursor.fetchone()
                if row:
                    rowid = row[0]
            
            if rowid is None:
                return False
                
            delete_query = f"DELETE FROM {self.table_name} WHERE rowid = ?"
            
            async with db.cursor() as cursor:
                await cursor.execute(delete_query, [rowid])
                deleted_count = cursor.rowcount
                await db.commit()
                
                return deleted_count > 0
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    async def delete_many(self, query: Dict) -> int:
        """
        Delete multiple documents matching the query.
        
        Args:
            query: Query to match
            
        Returns:
            Number of documents deleted
        """
        try:
            db = await DB.get_db()
            
            # Build WHERE clause and parameters
            where_clause, params = self._build_where_clause(query)
            
            # Build final query
            sql_query = f"DELETE FROM {self.table_name}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            
            async with db.cursor() as cursor:
                await cursor.execute(sql_query, params)
                deleted_count = cursor.rowcount
                await db.commit()
                
                return deleted_count
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return 0
    
    async def count_documents(self, query: Dict) -> int:
        """
        Count documents matching the query.
        
        Args:
            query: Query to match
            
        Returns:
            Number of matching documents
        """
        try:
            db = await DB.get_db()
            
            # Build WHERE clause and parameters
            where_clause, params = self._build_where_clause(query)
            
            # Build final query
            sql_query = f"SELECT COUNT(*) as count FROM {self.table_name}"
            if where_clause:
                sql_query += f" WHERE {where_clause}"
            
            async with db.execute(sql_query, params) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return 0
                    
                return row["count"]
        except Exception as e:
            print(f"Error counting documents: {e}")
            return 0
    
    async def aggregate(self, pipeline: List[Dict]) -> List[Dict]:
        """
        Perform an aggregation operation.
        Note: SQLite doesn't support MongoDB-style aggregation pipelines.
        This is a limited implementation that only supports basic operations.
        
        Args:
            pipeline: Aggregation pipeline
            
        Returns:
            Aggregation result
        """
        try:
            # This is a very simplified implementation
            # Only supports basic match and project stages
            results = []
            
            for stage in pipeline:
                if "$match" in stage:
                    # Transform match stage into a find operation
                    results = await self.find_many(query=stage["$match"])
                elif "$project" in stage:
                    # Apply projection to results
                    projection = stage["$project"]
                    new_results = []
                    
                    for doc in results:
                        projected_doc = {}
                        
                        # Determine if we're in include or exclude mode
                        include_mode = True
                        for key, value in projection.items():
                            if key != "_id" and value != 0 and value != 1:
                                continue
                                
                            if key != "_id":
                                include_mode = value == 1
                                break
                                
                        if include_mode:
                            # Include mode: only include specified fields
                            for key, value in projection.items():
                                if value == 1 and key in doc:
                                    projected_doc[key] = doc[key]
                        else:
                            # Exclude mode: include all fields except specified ones
                            projected_doc = doc.copy()
                            for key, value in projection.items():
                                if value == 0 and key in projected_doc:
                                    del projected_doc[key]
                                    
                        new_results.append(projected_doc)
                        
                    results = new_results
                    
            return results
        except Exception as e:
            print(f"Error aggregating documents: {e}")
            return []
    
    def _build_where_clause(self, query_dict: Dict = None) -> Tuple[str, List]:
        """
        Build a SQL WHERE clause from a dictionary.
        
        Args:
            query_dict: Dictionary representing the query
            
        Returns:
            (where_clause, parameters)
        """
        if not query_dict:
            return "", []
            
        conditions = []
        params = []
        
        for key, value in query_dict.items():
            if isinstance(value, dict):
                # Handle operators like $gt, $lt, etc.
                for op, op_value in value.items():
                    if op == "$gt":
                        conditions.append(f"{key} > ?")
                        params.append(op_value)
                    elif op == "$gte":
                        conditions.append(f"{key} >= ?")
                        params.append(op_value)
                    elif op == "$lt":
                        conditions.append(f"{key} < ?")
                        params.append(op_value)
                    elif op == "$lte":
                        conditions.append(f"{key} <= ?")
                        params.append(op_value)
                    elif op == "$ne":
                        conditions.append(f"{key} != ?")
                        params.append(op_value)
                    elif op == "$in":
                        placeholders = ", ".join(["?"] * len(op_value))
                        conditions.append(f"{key} IN ({placeholders})")
                        params.extend(op_value)
            else:
                # Simple equality check
                conditions.append(f"{key} = ?")
                params.append(value)
                
        if not conditions:
            return "", []
            
        # Combine all conditions with AND
        where_clause = " AND ".join(conditions)
            
        return where_clause, params
    
    def _build_select_clause(self, projection: Dict = None) -> str:
        """
        Build a SQL SELECT clause from a projection.
        
        Args:
            projection: Projection dictionary
            
        Returns:
            SELECT clause
        """
        if not projection:
            return "*"
            
        # Determine if we're in include or exclude mode
        include_mode = True
        for key, value in projection.items():
            if key != "_id" and value != 0 and value != 1:
                continue
                
            if key != "_id":
                include_mode = value == 1
                break
                
        if include_mode:
            # Include mode: only include specified fields
            columns = []
            for key, value in projection.items():
                if value == 1:
                    columns.append(key)
                    
            if not columns:
                return "*"
                
            return ", ".join(columns)
        else:
            # Exclude mode not directly supported in SQL
            # We would need to know all columns to exclude specific ones
            # For now, just return all columns
            return "*"
    
    def _build_order_clause(self, sort: List[Tuple[str, int]] = None) -> str:
        """
        Build a SQL ORDER BY clause from a sort specification.
        
        Args:
            sort: List of (field, direction) tuples
            
        Returns:
            ORDER BY clause
        """
        if not sort:
            return ""
            
        order_parts = []
        
        for field, direction in sort:
            direction_str = "ASC" if direction > 0 else "DESC"
            order_parts.append(f"{field} {direction_str}")
            
        return ", ".join(order_parts)