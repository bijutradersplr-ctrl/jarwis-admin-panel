import Dexie from 'dexie';

export const db = new Dexie('JarwisProLocalDB');

// Define the database schema
db.version(1).stores({
    // Global cache for routing and list rendering
    bills: 'id, route, salesman_id, shop_id, bill_no, _rev',

    // Cache for salesman targets and stats
    targets: 'salesman_id',

    // Queue for offline actions that need to sync to Firebase
    pending_sync: '++id, type, timestamp, data, status, retryCount'
});
