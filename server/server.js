import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());

// Increase JSON body parser limit and ensure it handles all content types
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const dbPath = join(__dirname, 'mockapi.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    fields TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS endpoint_data (
    id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    endpoint_path TEXT NOT NULL,
    method TEXT NOT NULL,
    request_body TEXT,
    response_status INTEGER,
    response_data TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    fields TEXT,
    created_at TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS table_endpoints (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    endpoint_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE,
    UNIQUE(table_id, endpoint_id)
  );
`);

// Add fields column if it doesn't exist (for existing databases)
try {
  const tableInfo = db.prepare("PRAGMA table_info(tables)").all();
  const hasFieldsColumn = tableInfo.some(col => col.name === 'fields');
  if (!hasFieldsColumn) {
    db.exec('ALTER TABLE tables ADD COLUMN fields TEXT');
  }
} catch (e) {
  // Ignore errors
}

// Helper to load endpoints from localStorage file (for migration)
const loadEndpointsFromFile = () => {
  try {
    // Try to read from localStorage backup or create empty array
    return [];
  } catch (e) {
    return [];
  }
};

// GET /api/endpoints - Get all endpoints
app.get('/api/endpoints', (req, res) => {
  try {
    const endpoints = db.prepare('SELECT * FROM endpoints').all();
    const result = endpoints.map(ep => {
      const fields = JSON.parse(ep.fields);
      const dataRows = db.prepare('SELECT * FROM endpoint_data WHERE endpoint_id = ? ORDER BY created_at DESC').all(ep.id);
      const data = dataRows.map(row => {
        try {
          // Parse the stored JSON data
          if (!row.data || row.data === '{}' || row.data === 'null') {
            // Skip empty data
            return null;
          }
          const parsed = JSON.parse(row.data);
          // Ensure id and createdAt are set correctly
          if (!parsed.id) parsed.id = row.id;
          if (!parsed.createdAt) parsed.createdAt = row.created_at;
          return parsed;
        } catch (e) {
          // If parsing fails, log and skip
          console.error('Error parsing data for endpoint', ep.id, 'row id:', row.id, 'error:', e.message, 'Raw data length:', row.data?.length);
          return null;
        }
      }).filter(record => {
        // Remove nulls and filter out records that are completely empty
        if (!record) return false;
        const keys = Object.keys(record).filter(k => k !== 'id' && k !== 'createdAt')
        return keys.length > 0 && keys.some(key => {
          const value = record[key]
          return value !== null && value !== undefined && value !== ''
        })
      });
      
      // Get request logs for this endpoint
      const requestLogs = db.prepare('SELECT * FROM request_logs WHERE endpoint_id = ? ORDER BY created_at DESC LIMIT 50').all(ep.id).map(log => {
        try {
          return {
            id: log.id,
            method: log.method,
            requestBody: log.request_body ? JSON.parse(log.request_body) : null,
            responseStatus: log.response_status,
            responseData: log.response_data ? JSON.parse(log.response_data) : null,
            createdAt: log.created_at
          };
        } catch (e) {
          return {
            id: log.id,
            method: log.method,
            requestBody: null,
            responseStatus: log.response_status,
            responseData: null,
            createdAt: log.created_at
          };
        }
      });
      
      return {
        id: ep.id,
        name: ep.name,
        path: ep.path,
        method: ep.method,
        fields,
        data,
        requestLogs,
        createdAt: ep.createdAt
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/endpoints - Create new endpoint
app.post('/api/endpoints', (req, res) => {
  try {
    const { id, name, path, method, fields, tableId } = req.body;
    const endpointId = id || Date.now().toString();
    const createdAt = new Date().toISOString();
    
    console.log('POST /api/endpoints - Creating endpoint:', { endpointId, name, path, method, tableId });
    console.log('POST /api/endpoints - Fields received:', JSON.stringify(fields, null, 2));
    console.log('POST /api/endpoints - Fields count:', fields?.length);
    if (fields && fields.length > 0) {
      console.log('POST /api/endpoints - First field:', JSON.stringify(fields[0], null, 2));
      console.log('POST /api/endpoints - First field has filterable?', fields[0].hasOwnProperty('filterable'), fields[0].filterable);
    }
    
    // Check if endpoint already exists
    const existing = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(endpointId);
    if (existing) {
      return res.json({
        id: existing.id,
        name: existing.name,
        path: existing.path,
        method: existing.method,
        fields: JSON.parse(existing.fields),
        data: [],
        createdAt: existing.createdAt
      });
    }
    
    db.prepare(`
      INSERT INTO endpoints (id, name, path, method, fields, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(endpointId, name, path, method, JSON.stringify(fields || []), createdAt);
    
    console.log('POST /api/endpoints - Endpoint saved to database:', endpointId);
    
    // Verify the endpoint was saved
    const saved = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(endpointId);
    if (saved) {
      console.log('POST /api/endpoints - Verified endpoint in database:', saved.id, saved.name);
    } else {
      console.error('POST /api/endpoints - ERROR: Endpoint not found in database after insert!');
    }
    
    // Associate with table if provided
    if (tableId) {
      console.log('Associating endpoint', endpointId, 'with table', tableId);
      const relationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      try {
        db.prepare(`
          INSERT INTO table_endpoints (id, table_id, endpoint_id, created_at)
          VALUES (?, ?, ?, ?)
        `).run(relationId, tableId, endpointId, createdAt);
        console.log('Created association:', relationId);
      } catch (e) {
        console.error('Error creating table-endpoint association:', e);
        // Continue even if association fails
      }
    }
    
    res.json({ id: endpointId, name, path, method, fields: fields || [], data: [], createdAt });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/endpoints/:id - Update endpoint
app.put('/api/endpoints/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, path, method, fields, tableId } = req.body;
    
    console.log('PUT /api/endpoints/:id - Updating endpoint:', id, { name, path, method, tableId });
    
    // Check if endpoint exists
    const endpoint = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    // Update endpoint
    db.prepare(`
      UPDATE endpoints 
      SET name = ?, path = ?, method = ?, fields = ?
      WHERE id = ?
    `).run(name, path, method, JSON.stringify(fields || []), id);
    
    // Handle table association
    if (tableId !== undefined) {
      // Remove existing associations for this endpoint
      db.prepare('DELETE FROM table_endpoints WHERE endpoint_id = ?').run(id);
      console.log('Removed existing associations for endpoint:', id);
      
      // Add new association if tableId is provided
      if (tableId) {
        const relationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const createdAt = new Date().toISOString();
        try {
          db.prepare(`
            INSERT INTO table_endpoints (id, table_id, endpoint_id, created_at)
            VALUES (?, ?, ?, ?)
          `).run(relationId, tableId, id, createdAt);
          console.log('Created new association:', relationId, 'table:', tableId, 'endpoint:', id);
        } catch (e) {
          console.error('Error creating table-endpoint association:', e);
          // Continue even if association fails
        }
      }
    }
    
    res.json({ 
      id, 
      name, 
      path, 
      method, 
      fields: fields || [], 
      createdAt: endpoint.createdAt 
    });
  } catch (error) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/endpoints/:id - Delete endpoint
app.delete('/api/endpoints/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if endpoint exists
    const endpoint = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    // Delete endpoint (cascade will delete related data and request logs)
    db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
    
    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tables API - Must be defined BEFORE the dynamic /api/* route
// GET /api/tables - Get all tables with their associated endpoints
app.get('/api/tables', (req, res) => {
  try {
    const tables = db.prepare('SELECT * FROM tables ORDER BY created_at DESC').all();
    const result = tables.map(table => {
      // Get associated endpoints
      const endpointIds = db.prepare(`
        SELECT endpoint_id FROM table_endpoints WHERE table_id = ?
      `).all(table.id).map(row => row.endpoint_id);
      
      const endpoints = endpointIds.length > 0 
        ? db.prepare(`SELECT * FROM endpoints WHERE id IN (${endpointIds.map(() => '?').join(',')})`).all(...endpointIds)
        : [];
      
      // Get all data from associated endpoints
      const allData = [];
      endpoints.forEach(ep => {
        const fields = JSON.parse(ep.fields);
        const dataRows = db.prepare('SELECT * FROM endpoint_data WHERE endpoint_id = ? ORDER BY created_at DESC').all(ep.id);
        const data = dataRows.map(row => {
          try {
            if (!row.data || row.data === '{}' || row.data === 'null') return null;
            const parsed = JSON.parse(row.data);
            if (!parsed.id) parsed.id = row.id;
            if (!parsed.createdAt) parsed.createdAt = row.created_at;
            
            // Debug: Log first record for this endpoint
            if (dataRows.indexOf(row) === 0) {
              console.log(`GET /api/tables - Endpoint ${ep.id} first record:`, parsed);
              console.log(`GET /api/tables - Record keys:`, Object.keys(parsed));
            }
            
            return parsed;
          } catch (e) {
            console.error('Error parsing row data:', e, row.data);
            return null;
          }
        }).filter(record => {
          // Don't filter out records - include all records that have at least an id
          if (!record) return false;
          // Include records that have an id (even if they only have id and createdAt)
          // This ensures POST requests that create minimal records are still shown
          return record.id !== null && record.id !== undefined;
        });
        allData.push(...data);
      });
      
      // Parse fields from database
      let fields = [];
      try {
        if (table.fields && table.fields !== 'null' && table.fields !== '') {
          fields = JSON.parse(table.fields);
        }
      } catch (e) {
        console.error('Error parsing table fields:', e);
        fields = [];
      }
      
      return {
        id: table.id,
        name: table.name,
        description: table.description,
        fields: fields,
        createdAt: table.created_at,
        endpoints: endpoints.map(ep => ({
          id: ep.id,
          name: ep.name,
          path: ep.path,
          method: ep.method,
          fields: JSON.parse(ep.fields)
        })),
        data: allData
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tables - Create new table
app.post('/api/tables', (req, res) => {
  try {
    const { name, description, fields = [], endpointIds = [] } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    const tableId = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO tables (id, name, description, fields, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tableId, name, description || null, JSON.stringify(fields || []), createdAt);
    
    // Associate endpoints if provided
    if (endpointIds.length > 0) {
      endpointIds.forEach(endpointId => {
        const relationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        try {
          db.prepare(`
            INSERT INTO table_endpoints (id, table_id, endpoint_id, created_at)
            VALUES (?, ?, ?, ?)
          `).run(relationId, tableId, endpointId, createdAt);
        } catch (e) {
          // Ignore duplicate associations
        }
      });
    }
    
    res.json({ id: tableId, name, description, fields: fields || [], createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tables/:id - Update table
app.put('/api/tables/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, fields, endpointIds } = req.body;
    
    console.log('PUT /api/tables/:id - Updating table:', id, {
      name,
      description,
      fieldsCount: fields?.length,
      endpointIds: endpointIds,
      endpointIdsType: Array.isArray(endpointIds) ? 'array' : typeof endpointIds,
      endpointIdsLength: Array.isArray(endpointIds) ? endpointIds.length : 'N/A'
    });
    
    const existing = db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    if (name || description !== undefined || fields !== undefined) {
      const updatedName = name || existing.name;
      const updatedDescription = description !== undefined ? description : existing.description;
      const updatedFields = fields !== undefined ? JSON.stringify(fields) : existing.fields;
      
      db.prepare('UPDATE tables SET name = ?, description = ?, fields = ? WHERE id = ?')
        .run(updatedName, updatedDescription || null, updatedFields, id);
    }
    
    // Update endpoint associations if provided
    if (endpointIds !== undefined) {
      console.log('Updating endpoint associations:', endpointIds);
      // Remove existing associations
      db.prepare('DELETE FROM table_endpoints WHERE table_id = ?').run(id);
      console.log('Deleted existing associations for table:', id);
      
      // Add new associations
      if (Array.isArray(endpointIds) && endpointIds.length > 0) {
        const createdAt = new Date().toISOString();
        endpointIds.forEach((endpointId, index) => {
          const relationId = Date.now().toString() + index + Math.random().toString(36).substr(2, 9);
          try {
            db.prepare(`
              INSERT INTO table_endpoints (id, table_id, endpoint_id, created_at)
              VALUES (?, ?, ?, ?)
            `).run(relationId, id, endpointId, createdAt);
            console.log('Inserted association:', relationId, 'table:', id, 'endpoint:', endpointId);
          } catch (e) {
            console.error('Error inserting association:', e);
            // Ignore duplicates
          }
        });
        console.log('Created', endpointIds.length, 'new associations');
      } else {
        console.log('No endpointIds to associate (empty array or not array)');
      }
    }
    
    res.json({ message: 'Table updated', endpointIds: endpointIds });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tables/:id - Delete table
app.delete('/api/tables/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tables WHERE id = ?').run(id);
    res.json({ message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dynamic route handler for all endpoint paths
app.all('/api/*', (req, res) => {
  // Remove /api prefix from the path
  let requestedPath = req.path.replace('/api', '');
  // Ensure it starts with /
  if (!requestedPath.startsWith('/')) {
    requestedPath = '/' + requestedPath;
  }
  const method = req.method;
  
  // For DELETE and GET, find endpoint by path only (any method)
  // since these operations work on any endpoint type
  let endpoint;
  if (method === 'DELETE' || method === 'GET') {
    // Find endpoint by path only (any method) - allows GET on POST endpoints
    endpoint = db.prepare(`
      SELECT * FROM endpoints 
      WHERE path = ?
      LIMIT 1
    `).get(requestedPath);
  } else {
    // For POST/PUT, match both path and method
    endpoint = db.prepare(`
      SELECT * FROM endpoints 
      WHERE path = ? AND method = ?
    `).get(requestedPath, method);
  }
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const fields = JSON.parse(endpoint.fields);
  
  // Handle different HTTP methods
  if (method === 'GET') {
    // For GET requests, also check if this endpoint is associated with a table
    // If so, get data from all endpoints associated with that table
    let endpointIds = [endpoint.id];
    
    const tableAssociations = db.prepare(`
      SELECT table_id FROM table_endpoints WHERE endpoint_id = ?
    `).all(endpoint.id);
    
    console.log('GET - Endpoint ID:', endpoint.id, 'Path:', endpoint.path, 'Method:', endpoint.method);
    console.log('GET - Table associations:', tableAssociations.length);
    
    if (tableAssociations.length > 0) {
      // This endpoint is associated with a table, get all endpoints for that table
      const tableId = tableAssociations[0].table_id;
      const allTableEndpoints = db.prepare(`
        SELECT endpoint_id FROM table_endpoints WHERE table_id = ?
      `).all(tableId);
      endpointIds = allTableEndpoints.map(row => row.endpoint_id);
      console.log('GET - Endpoint associated with table', tableId, ', fetching data from', endpointIds.length, 'endpoints:', endpointIds);
    } else {
      console.log('GET - Endpoint not associated with any table, using only endpoint', endpoint.id);
    }
    
    // Get data from all relevant endpoints
    const placeholders = endpointIds.map(() => '?').join(',');
    const dataRows = db.prepare(`
      SELECT * FROM endpoint_data 
      WHERE endpoint_id IN (${placeholders}) 
      ORDER BY created_at DESC
    `).all(...endpointIds);
    
    console.log('GET - Found', dataRows.length, 'data rows from', endpointIds.length, 'endpoint(s)');
    if (dataRows.length === 0 && endpointIds.length === 1) {
      console.log('GET - No data found. Checking if endpoint', endpointIds[0], 'has any data...');
      const checkData = db.prepare('SELECT COUNT(*) as count FROM endpoint_data WHERE endpoint_id = ?').get(endpointIds[0]);
      console.log('GET - Data count for endpoint', endpointIds[0], ':', checkData.count);
    }
    
    let data = dataRows.map(row => {
      try {
        // The data field already contains the full record with id and createdAt
        return JSON.parse(row.data);
      } catch (e) {
        // If parsing fails, return minimal record
        return {
          id: row.id,
          createdAt: row.created_at
        };
      }
    }).filter(record => {
      // Filter out completely empty records
      const keys = Object.keys(record).filter(k => k !== 'id' && k !== 'createdAt');
      return keys.length > 0 && keys.some(key => {
        const value = record[key];
        return value !== null && value !== undefined && value !== '';
      });
    });
    
    // Apply query parameter filters if provided
    const queryParams = req.query;
    if (queryParams && Object.keys(queryParams).length > 0) {
      console.log('Filtering GET request with query params:', queryParams);
      
      // Get filterable field names (fields marked as filterable)
      const filterableFields = fields.filter(f => f.filterable).map(f => f.name);
      console.log('Filterable fields:', filterableFields);
      
      // Filter data based on query parameters
      data = data.filter(record => {
        // Check if record matches all query parameters
        return Object.keys(queryParams).every(paramName => {
          // Only allow filtering by fields marked as filterable
          // Check filterable fields case-insensitively
          const paramNameLower = paramName.toLowerCase();
          const isFilterable = filterableFields.length === 0 || filterableFields.some(f => f.toLowerCase() === paramNameLower);
          
          if (filterableFields.length > 0 && !isFilterable) {
            console.log(`Field "${paramName}" is not filterable. Allowed fields: ${filterableFields.join(', ')}`);
            return true; // Ignore non-filterable params, don't filter them out
          }
          
          const paramValue = queryParams[paramName];
          
          // Find the record field by case-insensitive matching
          const recordKey = Object.keys(record).find(key => key.toLowerCase() === paramNameLower);
          if (!recordKey) {
            console.log(`Field "${paramName}" not found in record. Available keys: ${Object.keys(record).join(', ')}`);
            return false; // Field doesn't exist in record
          }
          
          const recordValue = record[recordKey];
          
          // Handle different types of comparisons
          if (recordValue === null || recordValue === undefined) {
            return false;
          }
          
          // String comparison (case-insensitive partial match)
          if (typeof recordValue === 'string') {
            return recordValue.toLowerCase().includes(String(paramValue).toLowerCase());
          }
          
          // Exact match for numbers, booleans, etc.
          return String(recordValue) === String(paramValue);
        });
      });
      console.log(`Filtered ${dataRows.length} records to ${data.length} matching query params`);
      if (data.length === 0 && dataRows.length > 0) {
        console.log('⚠️ WARNING: All records filtered out!');
        console.log('  - Query params:', queryParams);
        console.log('  - Filterable fields:', filterableFields);
        console.log('  - First record sample:', JSON.stringify(dataRows[0]?.data ? JSON.parse(dataRows[0].data) : null, null, 2));
      }
    }
    
    // Log the GET request
    const logId = Date.now().toString();
    const logCreatedAt = new Date().toISOString();
    console.log('GET request - Returning', data.length, 'records');
    db.prepare(`
      INSERT INTO request_logs (id, endpoint_id, endpoint_path, method, request_body, response_status, response_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, endpoint.id, requestedPath, method, JSON.stringify(queryParams || {}), 200, JSON.stringify(data), logCreatedAt);
    
    res.json(data);
  } 
  else if (method === 'POST' || method === 'PUT') {
    console.log('POST/PUT - Content-Type:', req.get('Content-Type'));
    console.log('POST/PUT - Content-Length:', req.get('Content-Length'));
    console.log('POST/PUT - req.body:', req.body);
    console.log('POST/PUT - req.body type:', typeof req.body);
    console.log('POST/PUT - req.body keys:', Object.keys(req.body || {}));
    
    const requestBody = req.body || {};
    
    if (Object.keys(requestBody).length === 0) {
      console.warn('POST/PUT - WARNING: Request body is empty!');
      console.warn('POST/PUT - This might be a body parsing issue. Check Content-Type header in Postman.');
    }
    
    // Validate required fields
    const missing = fields.filter(f => f.required && !requestBody[f.name]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missing.map(f => f.name) 
      });
    }
    
    // Store the data
    const recordId = Date.now().toString();
    const createdAt = new Date().toISOString();
    // Create record with all body data plus id and createdAt
    // Use requestBody which we've ensured has the data
    const record = { 
      ...requestBody, 
      id: recordId, 
      createdAt 
    };
    
    // Debug: Log what we're saving
    console.log('POST/PUT - Saving record:', JSON.stringify(record, null, 2));
    console.log('POST/PUT - Record keys:', Object.keys(record));
    
    // Store the full record (including id and createdAt) in the data field
    // Make sure we're storing the complete record, not just req.body
    const recordJson = JSON.stringify(record);
    db.prepare(`
      INSERT INTO endpoint_data (id, endpoint_id, data, created_at)
      VALUES (?, ?, ?, ?)
    `).run(recordId, endpoint.id, recordJson, createdAt);
    
    // Verify what was saved
    const saved = db.prepare('SELECT * FROM endpoint_data WHERE id = ?').get(recordId);
    if (saved) {
      console.log('POST/PUT - Verified saved data:', saved.data);
      const parsed = JSON.parse(saved.data);
      console.log('POST/PUT - Parsed saved data keys:', Object.keys(parsed));
    }
    
    // Log the POST/PUT request - ensure we capture the actual request body
    const logId = Date.now().toString();
    const logCreatedAt = new Date().toISOString();
    const requestBodyJson = Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : null;
    db.prepare(`
      INSERT INTO request_logs (id, endpoint_id, endpoint_path, method, request_body, response_status, response_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, endpoint.id, requestedPath, method, requestBodyJson, 201, JSON.stringify(record), logCreatedAt);
    
    // Return the complete record
    res.status(201).json(record);
  }
  else if (method === 'DELETE') {
    // Delete all data for this endpoint or specific record if ID provided
    if (req.query.id) {
      db.prepare('DELETE FROM endpoint_data WHERE id = ?').run(req.query.id);
      res.json({ message: 'Record deleted' });
    } else {
      db.prepare('DELETE FROM endpoint_data WHERE endpoint_id = ?').run(endpoint.id);
      res.json({ message: 'All records deleted' });
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
});
