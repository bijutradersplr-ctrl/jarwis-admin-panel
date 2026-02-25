import { useEffect } from 'react';
import { db as dexieDB } from '../db';
import { db as firestoreDB } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function useSyncManager() {
    useEffect(() => {
        const processQueue = async () => {
            if (!navigator.onLine) return;

            try {
                // Fetch all queued pending collections
                const pendingItems = await dexieDB.pending_sync
                    .where('status')
                    .equals('queued')
                    .toArray();

                if (pendingItems.length === 0) return;

                console.log(`[SyncManager] Found ${pendingItems.length} offline transactions. Syncing...`);

                for (const item of pendingItems) {
                    try {
                        if (item.type === 'pending_collections') {
                            const dataToPush = {
                                ...item.data,
                                timestamp: serverTimestamp() // convert back to server time
                            };

                            await addDoc(collection(firestoreDB, "pending_collections"), dataToPush);

                            // Success! Remove from local queue
                            await dexieDB.pending_sync.delete(item.id);
                            console.log(`[SyncManager] Successfully synced transaction ${item.id}`);
                        }
                    } catch (err) {
                        console.error(`[SyncManager] Failed to sync item ${item.id}`, err);
                        // Increment retry count
                        await dexieDB.pending_sync.update(item.id, {
                            retryCount: (item.retryCount || 0) + 1
                        });
                    }
                }
            } catch (globalErr) {
                console.error("[SyncManager] Queue Processing Error:", globalErr);
            }
        };

        // Run sync initially and then every 30 seconds
        processQueue();
        const interval = setInterval(processQueue, 30000);

        // Listen for online events to trigger immediate sync
        window.addEventListener('online', processQueue);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', processQueue);
        };
    }, []);
}
