// API Service Layer
// Syncs with backend when available, falls back to localStorage

const STORAGE_KEY = 'mockAPIEndpoints';
const BACKEND_URL = 'http://localhost:3000';

// Normalize path - remove /api prefix if present (backend adds it)
const normalizePath = (path) => {
  if (path.startsWith('/api/')) {
    return path.substring(4); // Remove '/api' but keep the leading '/'
  }
  return path;
};

// Check if backend is available
let backendAvailable = null;
let lastCheck = 0;
const CHECK_INTERVAL = 5000; // Re-check every 5 seconds

export const checkBackend = async () => {
  const now = Date.now();
  // Re-check periodically in case backend comes online
  if (backendAvailable !== null && (now - lastCheck) < CHECK_INTERVAL) {
    return backendAvailable;
  }
  
  lastCheck = now;
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    });
    backendAvailable = response.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
};

// Sync localStorage endpoints to backend
export const syncToBackend = async () => {
  const available = await checkBackend();
  if (!available) return;
  
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (!localData) return;
    
    const localEndpoints = JSON.parse(localData);
    const backendEndpoints = await fetch(`${BACKEND_URL}/api/endpoints`).then(r => r.json());
    
    // Create endpoints in backend that don't exist
    for (const localEp of localEndpoints) {
      const normalizedPath = normalizePath(localEp.path);
      const exists = backendEndpoints.find(be => be.id === localEp.id || 
        (be.path === normalizedPath && be.method === localEp.method));
      if (!exists) {
        await fetch(`${BACKEND_URL}/api/endpoints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: localEp.id,
            name: localEp.name,
            path: normalizedPath,
            method: localEp.method,
            fields: localEp.fields || []
          })
        });
      }
    }
  } catch (error) {
    console.error('Error syncing to backend:', error);
  }
};

// Get all endpoints
export const getEndpoints = async () => {
  const available = await checkBackend();
  
  if (available) {
    try {
      // Always fetch fresh data from backend (no cache, add timestamp to prevent caching)
      const timestamp = Date.now();
      const response = await fetch(`${BACKEND_URL}/api/endpoints?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const endpoints = await response.json();
        console.log('Fetched from backend:', endpoints.length, 'endpoints')
        if (endpoints.length > 0 && endpoints[0].data) {
          console.log('First endpoint data count:', endpoints[0].data.length)
        }
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
        return endpoints;
      } else {
        console.error('Backend response not OK:', response.status)
      }
    } catch (error) {
      console.error('Error fetching from backend, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  try {
    const endpoints = JSON.parse(data);
    // Try to sync to backend in background
    if (!available) {
      setTimeout(() => syncToBackend(), 100);
    }
    return endpoints;
  } catch (error) {
    console.error('Error parsing endpoints from localStorage:', error);
    return [];
  }
};

// Save all endpoints
export const saveEndpoints = async (endpoints) => {
  // Save to localStorage first
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
  } catch (error) {
    console.error('Error saving endpoints to localStorage:', error);
    return false;
  }
  
  // Sync to backend if available
  const available = await checkBackend();
  if (available) {
    try {
      // Get existing backend endpoints
      const backendEndpoints = await fetch(`${BACKEND_URL}/api/endpoints`).then(r => r.json());
      
      // Create/update each endpoint
      for (const endpoint of endpoints) {
        const exists = backendEndpoints.find(be => be.id === endpoint.id);
        if (!exists) {
          await fetch(`${BACKEND_URL}/api/endpoints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: endpoint.id,
              name: endpoint.name,
              path: normalizePath(endpoint.path),
              method: endpoint.method,
              fields: endpoint.fields || []
            })
          });
        }
      }
    } catch (error) {
      console.error('Error syncing endpoints to backend:', error);
    }
  }
  
  return true;
};

// Create a new endpoint
export const createEndpoint = async (endpoint) => {
  if (!endpoint || !endpoint.name || !endpoint.path) {
    throw new Error('Endpoint name and path are required');
  }
  
  const newEndpoint = {
    ...endpoint,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    data: [],
    requestLogs: []
  };
  
  // Create in backend if available (normalize path for backend)
  const available = await checkBackend();
  if (available) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newEndpoint.id,
          name: newEndpoint.name,
          path: normalizePath(newEndpoint.path),
          method: newEndpoint.method,
          fields: newEndpoint.fields || [],
          tableId: endpoint.tableId || null // Include table association
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create endpoint' }));
        throw new Error(errorData.error || 'Failed to create endpoint in backend');
      }
      
      const backendEndpoint = await response.json();
      // Merge backend response with our endpoint data
      newEndpoint.id = backendEndpoint.id || newEndpoint.id;
      newEndpoint.createdAt = backendEndpoint.createdAt || newEndpoint.createdAt;
    } catch (error) {
      console.error('Error creating endpoint in backend:', error);
      // Continue with localStorage fallback
    }
  }
  
  // Save to localStorage
  const endpoints = await getEndpoints();
  endpoints.push(newEndpoint);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
  
  return newEndpoint;
};

// Update an endpoint
export const updateEndpoint = async (endpointId, updates) => {
  // Update in backend if available
  const available = await checkBackend();
  if (available) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/endpoints/${endpointId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          path: updates.path,
          method: updates.method,
          fields: updates.fields || [],
          tableId: updates.tableId || null // Include table association
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update endpoint' }));
        throw new Error(errorData.error || 'Failed to update endpoint in backend');
      }
      
      const updated = await response.json();
      // Also update localStorage
      const endpoints = await getEndpoints();
      const index = endpoints.findIndex(e => e.id === endpointId);
      if (index !== -1) {
        endpoints[index] = { ...endpoints[index], ...updated };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
      }
      return updated;
    } catch (error) {
      console.error('Error updating endpoint in backend:', error);
      throw error;
    }
  }
  
  // Fallback to localStorage only
  const endpoints = await getEndpoints();
  const index = endpoints.findIndex(e => e.id === endpointId);
  if (index === -1) return null;
  
  endpoints[index] = { ...endpoints[index], ...updates };
  await saveEndpoints(endpoints);
  return endpoints[index];
};

// Delete an endpoint
export const deleteEndpoint = async (endpointId) => {
  // Delete from backend if available
  const available = await checkBackend();
  if (available) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/endpoints/${endpointId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete endpoint' }));
        throw new Error(errorData.error || 'Failed to delete endpoint from backend');
      }
    } catch (error) {
      console.error('Error deleting endpoint from backend:', error);
      throw error;
    }
  }
  
  // Also delete from localStorage
  const endpoints = await getEndpoints();
  const filtered = endpoints.filter(e => e.id !== endpointId);
  await saveEndpoints(filtered);
  return true;
};

// Add data to an endpoint
export const addData = async (endpointId, data) => {
  const endpoints = await getEndpoints();
  const endpoint = endpoints.find(e => e.id === endpointId);
  if (!endpoint) return null;
  
  const newRecord = {
    ...data,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  
  // Add to backend if available
  const available = await checkBackend();
  if (available) {
    try {
      const normalizedPath = normalizePath(endpoint.path);
      const response = await fetch(`${BACKEND_URL}/api${normalizedPath}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        const backendRecord = await response.json();
        // Use the record from backend (includes id and createdAt)
        newRecord.id = backendRecord.id || newRecord.id;
        newRecord.createdAt = backendRecord.createdAt || newRecord.createdAt;
      }
    } catch (error) {
      console.error('Error adding data to backend:', error);
    }
  }
  
  // Also save to localStorage
  endpoint.data.push(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
  
  return newRecord;
};

// Delete data from an endpoint
export const deleteData = async (endpointId, recordId) => {
  const endpoints = await getEndpoints();
  const endpoint = endpoints.find(e => e.id === endpointId);
  if (!endpoint) return false;
  
  // Delete from backend if available
  const available = await checkBackend();
  if (available) {
    try {
      const normalizedPath = normalizePath(endpoint.path);
      const response = await fetch(`${BACKEND_URL}/api${normalizedPath}?id=${recordId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.error('Failed to delete from backend:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting from backend:', error);
    }
  }
  
  // Also delete from localStorage
  endpoint.data = endpoint.data.filter(r => r.id !== recordId);
  await saveEndpoints(endpoints);
  return true;
};

// Clear all data from an endpoint
export const clearData = async (endpointId) => {
  const endpoints = await getEndpoints();
  const endpoint = endpoints.find(e => e.id === endpointId);
  if (!endpoint) return false;
  
  endpoint.data = [];
  await saveEndpoints(endpoints);
  return true;
};

// Export endpoints
export const exportEndpoints = async () => {
  const endpoints = await getEndpoints();
  const dataStr = JSON.stringify(endpoints, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mock-api-endpoints-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Import endpoints
export const importEndpoints = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const existing = await getEndpoints();
        // Merge: keep existing, add new ones
        const merged = [...existing];
        imported.forEach(imp => {
          const exists = merged.find(e => e.id === imp.id);
          if (!exists) {
            merged.push(imp);
          }
        });
        await saveEndpoints(merged);
        resolve(merged);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Tables API
export const getTables = async () => {
  const available = await checkBackend();
  if (!available) return [];
  
  try {
    const timestamp = Date.now();
    const response = await fetch(`${BACKEND_URL}/api/tables?t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
  }
  return [];
};

export const createTable = async (tableData) => {
  const available = await checkBackend();
  if (!available) {
    throw new Error('Backend not available');
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tableData)
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create table');
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
};

export const updateTable = async (tableId, updates) => {
  const available = await checkBackend();
  if (!available) {
    throw new Error('Backend not available');
  }
  
  try {
    console.log('Updating table:', tableId, updates);
    const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (response.ok) {
      const result = await response.json();
      console.log('Table updated successfully:', result);
      return result;
    }
    const errorData = await response.json().catch(() => ({ error: 'Failed to update table' }));
    throw new Error(errorData.error || 'Failed to update table');
  } catch (error) {
    console.error('Error updating table:', error);
    throw error;
  }
};

export const deleteTable = async (tableId) => {
  const available = await checkBackend();
  if (!available) {
    throw new Error('Backend not available');
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting table:', error);
    throw error;
  }
};
