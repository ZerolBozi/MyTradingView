from typing import List, Dict, Optional
from datetime import datetime

from app.database.base import SQLiteBase   

class WatchListDB:
    def __init__(self):
        """
        Initialize the watch list manager with SQLiteBase instances for both tables.
        """
        self.lists_db = SQLiteBase("watch_lists")
        self.items_db = SQLiteBase("watch_list_items")

    async def create_watch_list(
        self,
        name: str,
        description: str = ""
    ) -> bool:
        """
        Create a new watch list.
        
        Args:
            name: Watch list name
            description: Watch list description
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if watch list with the same name already exists
            existing = await self.lists_db.find_one({"name": name})
            if existing:
                return False
            
            # Create new watch list
            now = datetime.now().isoformat()
            doc_id = await self.lists_db.insert_one({
                "name": name,
                "description": description,
                "create_time": now,
                "update_time": now
            })
            
            return doc_id is not None
        except Exception as e:
            print(f"Error creating watch list: {e}")
            return False
        
    async def get_all_watch_lists(self) -> List[Dict]:
        """
        Get all watch lists.
        
        Returns:
            List of watch lists
        """
        try:
            # Get all watch lists
            watch_lists = await self.lists_db.find_many(
                sort=[("name", 1)]  # Sort by name in ascending order
            )
            
            # Enrich with item counts
            for watch_list in watch_lists:
                list_id = watch_list["id"]
                count = await self.items_db.count_documents({"list_id": list_id})
                watch_list["item_count"] = count
                
            return watch_lists
        except Exception as e:
            print(f"Error getting watch lists: {e}")
            return []
        
    async def get_all_watch_lists_with_items(self) -> List[Dict]:
        """
        Get all watch lists with their items.
        
        Returns:
            List of watch lists with items property containing all items in each list
        """
        try:
            # Get all watch lists
            watch_lists = await self.get_all_watch_lists()
            
            # For each watch list, fetch and add its items
            for watch_list in watch_lists:
                list_id = watch_list["id"]
                items = await self.get_watch_list_items(list_id)
                watch_list["items"] = items
                
            return watch_lists
        except Exception as e:
            print(f"Error getting watch lists with items: {e}")
            return []
        
    async def get_watch_list_items_by_id(self, list_id: int) -> Optional[List]:
        """
        Get a watch list all items by ID.
        
        Args:
            list_id: Watch list ID
            
        Returns:
            Watch list items if found, None otherwise
        """
        try:
            return await self.items_db.find_many({"list_id": list_id})
        except Exception as e:
            print(f"Error getting watch list by ID: {e}")
            return None
        
    async def get_watch_list(self, list_id: int) -> Optional[Dict]:
        """
        Get a watch list by ID.
        
        Args:
            list_id: Watch list ID
            
        Returns:
            Watch list if found, None otherwise
        """
        try:
            return await self.lists_db.find_one({"id": list_id})
        except Exception as e:
            print(f"Error getting watch list: {e}")
            return None
        
    async def get_watch_list_by_name(self, name: str) -> Optional[Dict]:
        """
        Get a watch list by name.
        
        Args:
            name: Watch list name
            
        Returns:
            Watch list if found, None otherwise
        """
        try:
            return await self.lists_db.find_one({"name": name})
        except Exception as e:
            print(f"Error getting watch list by name: {e}")
            return None
        
    async def update_watch_list(
        self,
        list_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> bool:
        """
        Update a watch list.
        
        Args:
            list_id: Watch list ID
            name: New watch list name (optional)
            description: New watch list description (optional)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if the watch list exists
            existing = await self.lists_db.find_one({"id": list_id})
            if not existing:
                return False
            
            # Build update document
            updates = {}
            if name:
                updates["name"] = name
                
            if description:
                updates["description"] = description
                
            if not updates:
                return True  # Nothing to update
                
            updates["update_time"] = datetime.now().isoformat()
            
            # Perform update
            return await self.lists_db.update_one(
                {"id": list_id},
                {"$set": updates}
            )
        except Exception as e:
            print(f"Error updating watch list: {e}")
            return False
        
    async def delete_watch_list(self, list_id: int) -> bool:
        """
        Delete a watch list and all its items.
        
        Args:
            list_id: Watch list ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Delete all items in the watch list
            await self.items_db.delete_many({"list_id": list_id})
            
            # Delete the watch list
            return await self.lists_db.delete_one({"id": list_id})
        except Exception as e:
            print(f"Error deleting watch list: {e}")
            return False

    async def add_item_to_watch_list(
        self,
        list_id: int,
        symbol: str,
        full_name: str,
        description: str,
        exchange: str
    ) -> bool:
        """
        Add an item to a watch list.
        
        Args:
            list_id: Watch list ID
            symbol: Symbol
            full_name: Full name of the symbol
            description: Symbol description
            exchange: Exchange
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if the watch list exists
            watch_list = await self.lists_db.find_one({"id": list_id})
            if not watch_list:
                return False
            
            # Check if the item already exists
            existing = await self.items_db.find_one({
                "list_id": list_id,
                "symbol": symbol,
                "exchange": exchange
            })
            
            if existing:
                return False
            
            now = datetime.now().isoformat()
            
            doc_id = await self.items_db.insert_one({
                "list_id": list_id,
                "symbol": symbol,
                "full_name": full_name,
                "description": description,
                "exchange": exchange,
                "create_time": now,
                "update_time": now
            })
            
            return doc_id is not None
        except Exception as e:
            print(f"Error adding item to watch list: {e}")
            return False
        
    async def remove_item_from_watch_list(
        self,
        list_id: int,
        full_name: str,
    ) -> bool:
        """
        Remove an item from a watch list.
        
        Args:
            list_id: Watch list ID
            symbol: Symbol
            exchange: Exchange (optional, if not provided will remove all matching symbols)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "list_id": list_id,
                "full_name": full_name
            }
    
            return await self.items_db.delete_one(query)
        except Exception as e:
            print(f"Error removing item from watch list: {e}")
            return False
        
    async def get_watch_list_items(
        self,
        list_id: int,
        sort_field: str = "create_time",
        sort_direction: int = 1
    ) -> List[Dict]:
        """
        Get all items in a watch list.
        
        Args:
            list_id: Watch list ID
            sort_field: Field to sort by
            sort_direction: Sort direction (1 for ascending, -1 for descending)
            
        Returns:
            List of items
        """
        try:
            # Validate sort field
            allowed_sort_fields = ["symbol", "full_name", "exchange", "create_time", "update_time"]
            if sort_field not in allowed_sort_fields:
                sort_field = "symbol"
                
            # Validate sort direction
            if sort_direction not in [1, -1]:
                sort_direction = 1
                
            return await self.items_db.find_many(
                {"list_id": list_id},
                sort=[(sort_field, sort_direction)]
            )
        except Exception as e:
            print(f"Error getting watch list items: {e}")
            return []