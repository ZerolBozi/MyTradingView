from datetime import datetime
from typing import Dict, Optional, List

from app.database.base import SQLiteBase

class ChartStorageDB:
    """
    Chart storage database class for managing chart data.
    """
    def __init__(self):
        """
        Initialize the chart storage database.
        """
        self.sqlite_base = SQLiteBase("charts_storage")
    
    async def save_chart(
        self,
        name: str,
        content: str,
        symbol: str,
        resolution: str,
        timestamp: Optional[int] = None
    ) -> bool:
        """
        Save a chart to the database.
        
        Args:
            name: Chart name
            content: Chart content
            symbol: Chart symbol
            resolution: Chart resolution
            timestamp: Chart timestamp (milliseconds since epoch)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if timestamp is None:
                timestamp = int(datetime.now().timestamp() * 1000)

            # Check if chart with the same name exists
            existing = await self.sqlite_base.find_one({"name": name})
            
            if existing:
                # Update existing chart
                success = await self.sqlite_base.update_one(
                    {"name": name},
                    {"$set": {
                        "content": content,
                        "symbol": symbol,
                        "resolution": resolution,
                        "timestamp": timestamp,
                        "update_time": datetime.now().isoformat()
                    }}
                )
                return success
            else:
                # Insert new chart
                doc_id = await self.sqlite_base.insert_one({
                    "name": name,
                    "content": content,
                    "symbol": symbol,
                    "resolution": resolution,
                    "timestamp": timestamp,
                    "update_time": datetime.now().isoformat()
                })
                return doc_id is not None
                
        except Exception as e:
            print(f"Error saving chart: {e}")
            return False
        
    async def get_latest_chart(self) -> Dict:
        """
        Get the latest chart by timestamp.
        
        Returns:
            Latest chart or None if no charts exist
        """
        try:
            # Use sort to get the chart with the highest timestamp
            charts = await self.sqlite_base.find_many(
                query={},
                sort=[("timestamp", -1)],
                limit=1
            )
            
            if not charts:
                return None
                
            return charts[0]
                
        except Exception as e:
            print(f"Error getting latest chart: {e}")
            return {}
        
    async def get_chart(self, id: int) -> Optional[Dict]:
        """
        Get a chart by ID.
        
        Args:
            id: Chart ID
            
        Returns:
            Chart or None if not found
        """
        try:
            return await self.sqlite_base.find_one({"id": id})
                
        except Exception as e:
            print(f"Error getting chart: {e}")
            return None

    async def get_all_charts(self) -> List[Dict]:
        """
        Get all charts, sorted by timestamp in descending order.
        
        Returns:
            List of charts
        """
        try:
            # Use find_many with sort to get all charts sorted by timestamp
            return await self.sqlite_base.find_many(
                query={},
                sort=[("timestamp", -1)]
            )
                
        except Exception as e:
            print(f"Error getting all charts: {e}")
            return []

    async def delete_chart(self, id: int) -> bool:
        """
        Delete a chart by ID.
        
        Args:
            id: Chart ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            return await self.sqlite_base.delete_one({"id": id})
                
        except Exception as e:
            print(f"Error deleting chart: {e}")
            return False