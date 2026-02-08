import { useState, useEffect } from 'react'
import { Plus, Download, Upload, Copy, Check, RefreshCw, Database, Server, Sparkles } from 'lucide-react'
import { getEndpoints, createEndpoint, updateEndpoint, deleteEndpoint, exportEndpoints, importEndpoints, checkBackend } from '../services/apiService'
import { getTables, createTable, updateTable, deleteTable } from '../services/apiService'
import { generateSingleRecord } from '../utils/mockDataGenerator'
import Sidebar from './Sidebar'
import EndpointForm from './EndpointForm'
import EndpointTester from './EndpointTester'
import DataTable from './DataTable'
import RequestLog from './RequestLog'
import TableForm from './TableForm'
import TableView from './TableView'

function MockAPIBuilder() {
  const [endpoints, setEndpoints] = useState([])
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState(null) // Track which endpoint is being edited
  const [storageMode, setStorageMode] = useState('browser') // 'browser' or 'server'
  const [copiedType, setCopiedType] = useState(null) // 'url' or 'curl'
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [showTableForm, setShowTableForm] = useState(false)
  const [viewMode, setViewMode] = useState('endpoints') // 'endpoints' or 'tables'
  const [error, setError] = useState(null)
  const [exampleBodyKey, setExampleBodyKey] = useState(0) // Force regeneration of example body

  const loadEndpoints = async (currentSelected = null) => {
    try {
      const data = await getEndpoints()
      const endpointsList = Array.isArray(data) ? data : []
      setEndpoints(endpointsList)
      
      // Use the passed parameter or state to check for selected endpoint
      const selected = currentSelected !== null ? currentSelected : selectedEndpoint
      
      // Always update selected endpoint with latest data from backend
      if (selected && selected.id) {
        const updated = endpointsList.find(e => e && e.id === selected.id)
        if (updated) {
          // Always update to ensure we have latest data
          const currentDataLength = (selected.data || []).length
          const updatedDataLength = (updated.data || []).length
          
          // Always update if data changed - use deep comparison
          const currentDataStr = JSON.stringify((selected.data || []).map(r => r?.id).sort())
          const updatedDataStr = JSON.stringify((updated.data || []).map(r => r?.id).sort())
          
          if (currentDataStr !== updatedDataStr || currentDataLength !== updatedDataLength) {
            console.log('🔄 Data changed:', updated.name, currentDataLength, '->', updatedDataLength)
            console.log('🔄 Updated data sample:', updated.data?.[0])
            setSelectedEndpoint({ ...updated })
          }
        } else {
          // Selected endpoint was deleted, clear selection
          setSelectedEndpoint(null)
        }
      }
    } catch (error) {
      console.error('Error loading endpoints:', error)
      setEndpoints([]) // Set empty array on error to prevent undefined issues
    }
  }

  const loadTables = async () => {
    try {
      const data = await getTables()
      console.log('Loaded tables:', data.length, data.map(t => t.name))
      setTables(data)
      
      // Update selected table if it exists
      if (selectedTable) {
        const updated = data.find(t => t.id === selectedTable.id)
        if (updated) {
          setSelectedTable(updated)
        } else {
          // Table was deleted, clear selection
          setSelectedTable(null)
        }
      }
    } catch (error) {
      console.error('Error loading tables:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await loadEndpoints()
      await loadTables()
    }
    loadData()
    
    // Auto-refresh every 2 seconds to sync with backend/Postman
    const interval = setInterval(() => {
      loadEndpoints()
      loadTables()
    }, 2000)
    
    return () => clearInterval(interval)
  }, []) // Run on mount only - don't refresh on selection changes to avoid conflicts
  
  // Sync existing endpoints to backend on mount
  useEffect(() => {
    const syncExisting = async () => {
      const { syncToBackend } = await import('../services/apiService')
      // Give it a moment for backend to be ready
      setTimeout(() => {
        syncToBackend()
      }, 1000)
    }
    syncExisting()
  }, [])

  const handleCreateEndpoint = async (endpointData) => {
    try {
      console.log('Saving endpoint with data:', endpointData)
      let resultEndpoint = null
      if (editingEndpoint) {
        // Update existing endpoint
        const updated = await updateEndpoint(editingEndpoint.id, endpointData)
        if (!updated) {
          throw new Error('Failed to update endpoint')
        }
        resultEndpoint = updated
        setEditingEndpoint(null)
      } else {
        // Create new endpoint
        const newEndpoint = await createEndpoint(endpointData)
        if (!newEndpoint || !newEndpoint.id) {
          throw new Error('Failed to create endpoint - invalid response')
        }
        resultEndpoint = newEndpoint
      }
      
      // Reload endpoints and tables to reflect associations
      await loadEndpoints(resultEndpoint)
      await loadTables()
      setSelectedEndpoint(resultEndpoint)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating/updating endpoint:', error)
      alert('Error: ' + (error.message || 'Failed to save endpoint'))
      // Don't close form on error so user can fix it
    }
  }

  const handleEditEndpoint = (endpoint) => {
    setEditingEndpoint(endpoint)
    setShowForm(true)
  }

  const handleDeleteEndpoint = async (endpointId) => {
    if (confirm('Are you sure you want to delete this endpoint?')) {
      await deleteEndpoint(endpointId)
      await loadEndpoints()
      if (selectedEndpoint?.id === endpointId) {
        setSelectedEndpoint(null)
      }
    }
  }

  const handleCreateTable = async (tableData) => {
    try {
      const available = await checkBackend()
      if (!available) {
        throw new Error('Backend not available. Please ensure the backend server is running on http://localhost:3000')
      }
      
      console.log('Creating table with data:', tableData)
      const createdTable = await createTable(tableData)
      console.log('Table created successfully:', createdTable)
      
      // Wait a moment for backend to fully persist
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reload tables to get the full table data with endpoints
      await loadTables()
      
      // Find and select the newly created table
      const updatedTables = await getTables()
      console.log('Updated tables after creation:', updatedTables.length)
      const newTable = updatedTables.find(t => t.id === createdTable.id)
      
      if (newTable) {
        console.log('Selecting new table:', newTable.name)
        setSelectedTable(newTable)
        setViewMode('tables')
      } else {
        console.warn('Newly created table not found in updated list')
        // Still switch to tables view
        setViewMode('tables')
      }
      
      setShowTableForm(false)
    } catch (error) {
      console.error('Error creating table:', error)
      alert('Error creating table: ' + error.message)
    }
  }

  const handleDeleteTable = async (tableId) => {
    if (confirm('Are you sure you want to delete this table?')) {
      try {
        await deleteTable(tableId)
        await loadTables()
        if (selectedTable?.id === tableId) {
          setSelectedTable(null)
        }
      } catch (error) {
        alert('Error deleting table: ' + error.message)
      }
    }
  }

  const handleUpdateTable = async (tableId, updates) => {
    try {
      console.log('handleUpdateTable called with:', tableId, updates)
      const result = await updateTable(tableId, updates)
      console.log('updateTable result:', result)
      // Wait a moment for backend to fully persist
      await new Promise(resolve => setTimeout(resolve, 300))
      await loadTables()
      // Update selected table to reflect changes
      const updatedTables = await getTables()
      const updatedTable = updatedTables.find(t => t.id === tableId)
      if (updatedTable) {
        console.log('Updated table from backend:', updatedTable.endpoints?.length, 'endpoints')
        setSelectedTable(updatedTable)
      }
      setShowTableForm(false)
    } catch (error) {
      console.error('Error updating table:', error)
      alert('Error updating table: ' + error.message)
    }
  }

  const handleExport = async () => {
    await exportEndpoints()
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (confirm('This will merge the imported endpoints with your existing ones. Continue?')) {
      try {
        await importEndpoints(file)
        await loadEndpoints()
        alert('Endpoints imported successfully!')
      } catch (error) {
        alert('Error importing endpoints: ' + error.message)
      }
    }
    event.target.value = '' // Reset file input
  }

  const handleGenerateSampleData = async (endpoint) => {
    // Force reload from backend to get latest data
    console.log('Refreshing data for endpoint:', endpoint.name)
    await loadEndpoints()
    // Double-check and update selected endpoint
    const updated = await getEndpoints()
    const updatedEndpoint = updated.find(e => e.id === endpoint.id)
    if (updatedEndpoint) {
      console.log('Updated endpoint data count:', updatedEndpoint.data?.length || 0)
      // Force update by creating new object reference
      setSelectedEndpoint({ ...updatedEndpoint })
    } else {
      console.warn('Endpoint not found in updated list:', endpoint.id)
    }
  }

  const getEndpointUrl = (endpoint, includeQueryParams = false) => {
    if (!endpoint || !endpoint.path) {
      return 'http://localhost:3000/api/'
    }
    // For now, show the format that would work with a backend
    // When backend is connected, this would be the actual URL
    const baseUrl = storageMode === 'server' 
      ? 'http://localhost:3000/api' 
      : 'http://localhost:3000/api' // Default to backend URL format
    
    // Remove /api prefix from path if it exists to avoid double /api/api/
    let path = endpoint.path || '/'
    if (path.startsWith('/api/')) {
      path = path.substring(4) // Remove '/api' but keep the leading '/'
    }
    
    let url = `${baseUrl}${path}`
    
    // Add query parameters if requested and fields exist
    if (includeQueryParams && endpoint.fields && endpoint.fields.length > 0) {
      const queryParams = generateQueryParams(endpoint)
      if (queryParams) {
        url += `?${queryParams}`
      }
    }
    
    return url
  }

  // Generate query parameter string for GET endpoints
  const generateQueryParams = (endpoint) => {
    if (!endpoint.fields || endpoint.fields.length === 0) {
      return ''
    }
    
    // Only use filterable fields for query params
    const filterableFields = endpoint.fields.filter(f => f.filterable)
    if (filterableFields.length === 0) {
      return ''
    }
    
    // Take first 3 filterable fields as examples for query params
    const exampleFields = filterableFields.slice(0, 3)
    const params = exampleFields.map(field => {
      const exampleValue = generateQueryParamValue(field)
      return `${encodeURIComponent(field.name)}=${encodeURIComponent(exampleValue)}`
    })
    
    return params.join('&')
  }

  // Generate example value for a query parameter based on field type
  const generateQueryParamValue = (field) => {
    // Create a temporary endpoint with just this field to use the generator
    const tempEndpoint = { fields: [field] }
    const record = generateSingleRecord(tempEndpoint)
    return String(record[field.name] || '')
  }

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedType(type)
        setTimeout(() => setCopiedType(null), 2000)
      } catch (fallbackErr) {
        alert('Failed to copy. Text: ' + text)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleCopyUrl = async (endpoint) => {
    const url = getEndpointUrl(endpoint)
    await copyToClipboard(url, 'url')
  }

  const getCurlCommand = (endpoint, includeQueryParams = false) => {
    if (!endpoint) {
      return 'curl -X GET "http://localhost:3000/api/"'
    }
    const url = getEndpointUrl(endpoint, includeQueryParams)
    const method = endpoint.method || 'GET'
    if (method === 'GET') {
      return `curl -X GET "${url}"`
    } else if (method === 'POST' || method === 'PUT') {
      const exampleBody = endpoint.fields && endpoint.fields.length > 0
        ? JSON.stringify(generateSingleRecord(endpoint), null, 2)
        : '{}'
      return `curl -X ${method} "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${exampleBody.replace(/'/g, "'\\''")}'`
    } else if (method === 'DELETE') {
      return `curl -X DELETE "${url}"`
    }
    return `curl -X ${method} "${url}"`
  }

  const handleCopyCurl = async (endpoint) => {
    const curlCommand = getCurlCommand(endpoint)
    await copyToClipboard(curlCommand, 'curl')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        endpoints={endpoints}
        selectedEndpoint={selectedEndpoint}
        onSelectEndpoint={(ep) => {
          setSelectedEndpoint(ep)
          setViewMode('endpoints')
          setSelectedTable(null)
        }}
        onDeleteEndpoint={handleDeleteEndpoint}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(table) => {
          setSelectedTable(table)
          setViewMode('tables')
          setSelectedEndpoint(null)
        }}
        onDeleteTable={handleDeleteTable}
        viewMode={viewMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mock API Builder</h1>
              <p className="text-sm text-gray-500 mt-1">Create and test mock API endpoints</p>
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'endpoints' ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  New Endpoint
                </button>
              ) : (
                <button
                  onClick={() => setShowTableForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Database size={20} />
                  New Table
                </button>
              )}
              <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <Upload size={20} />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download size={20} />
                Export
              </button>
            </div>
          </div>
          
          {/* View Mode Tabs */}
          <div className="px-6 flex items-center gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setViewMode('endpoints')
                setSelectedTable(null)
                setShowTableForm(false)
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                viewMode === 'endpoints'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Server size={16} className="inline mr-2" />
              Endpoints
            </button>
            <button
              onClick={() => {
                setViewMode('tables')
                setSelectedEndpoint(null)
                setShowForm(false)
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                viewMode === 'tables'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database size={16} className="inline mr-2" />
              Tables
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {viewMode === 'tables' ? (
            // Tables View
            <>
              {showTableForm ? (
                <TableForm
                  endpoints={endpoints}
                  onSubmit={handleCreateTable}
                  onCancel={() => setShowTableForm(false)}
                />
              ) : selectedTable ? (
                <TableView
                  table={selectedTable}
                  onRefresh={loadTables}
                  onDelete={handleDeleteTable}
                  onEdit={handleUpdateTable}
                  endpoints={endpoints}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                      No table selected
                    </h2>
                    <p className="text-gray-500 mb-4">
                      Select a table from the sidebar or create a new one
                    </p>
                    <button
                      onClick={() => setShowTableForm(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Your First Table
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Endpoints View
            <>
              {showForm ? (
                <EndpointForm
                  onSubmit={handleCreateEndpoint}
                  onCancel={() => {
                    setShowForm(false)
                    setEditingEndpoint(null)
                  }}
                  tables={tables}
                  initialData={editingEndpoint}
                />
              ) : selectedEndpoint && selectedEndpoint.id ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedEndpoint.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedEndpoint.method} {selectedEndpoint.path}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditEndpoint(selectedEndpoint)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Edit endpoint"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                    
                    {/* Endpoint URL for Postman */}
                    <div className="mt-4 space-y-3">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Endpoint URL (for Postman/API testing)
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-800 break-all">
                                {getEndpointUrl(selectedEndpoint)}
                              </code>
                              <button
                                onClick={() => handleCopyUrl(selectedEndpoint)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                title="Copy URL to clipboard"
                              >
                                {copiedType === 'url' ? (
                                  <>
                                    <Check size={18} />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={18} />
                                    Copy URL
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* cURL Command */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              cURL Command
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-800 break-all whitespace-pre-wrap">
                                {getCurlCommand(selectedEndpoint)}
                              </code>
                              <button
                                onClick={() => handleCopyCurl(selectedEndpoint)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                                title="Copy cURL command to clipboard"
                              >
                                {copiedType === 'curl' ? (
                                  <>
                                    <Check size={18} />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={18} />
                                    Copy cURL
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Postman Example Body - Only for POST/PUT */}
                      {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') ? (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-blue-700">
                              📋 Postman Example Body (JSON)
                            </label>
                            {selectedEndpoint.fields && selectedEndpoint.fields.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Force regeneration by updating key
                                  setExampleBodyKey(prev => prev + 1)
                                }}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                title="Regenerate example body with realistic data"
                              >
                                <Sparkles size={14} />
                                Regenerate
                              </button>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <code key={exampleBodyKey} className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm font-mono text-gray-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                              {selectedEndpoint.fields && selectedEndpoint.fields.length > 0 ? (
                                JSON.stringify(
                                  generateSingleRecord(selectedEndpoint),
                                  null,
                                  2
                                )
                              ) : (
                                '{}'
                              )}
                            </code>
                            <button
                              onClick={() => {
                                const exampleBody = selectedEndpoint.fields && selectedEndpoint.fields.length > 0
                                  ? generateSingleRecord(selectedEndpoint)
                                  : {};
                                const exampleBodyJson = JSON.stringify(exampleBody, null, 2);
                                copyToClipboard(exampleBodyJson, 'example');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                              title="Copy example body to clipboard"
                            >
                              {copiedType === 'example' ? (
                                <>
                                  <Check size={18} />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={18} />
                                  Copy Body
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            {selectedEndpoint.fields && selectedEndpoint.fields.length > 0 ? (
                              <>💡 Copy this JSON body and paste it into Postman's Body tab (select "raw" and "JSON"). Click "Regenerate" for new sample data.</>
                            ) : (
                              <>💡 This endpoint has no fields defined. Add fields to the endpoint to see an example body here.</>
                            )}
                          </p>
                        </div>
                      ) : selectedEndpoint.method === 'GET' && selectedEndpoint.fields && selectedEndpoint.fields.length > 0 ? (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-green-700">
                              🔍 Query Parameters (for filtering/searching)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setExampleBodyKey(prev => prev + 1)
                              }}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              title="Regenerate query parameter examples"
                            >
                              <Sparkles size={14} />
                              Regenerate
                            </button>
                          </div>
                          <div className="space-y-3">
                            {/* Example URL with query params */}
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Example URL with Query Parameters:
                              </label>
                              <div className="flex items-start gap-2">
                                <code key={exampleBodyKey} className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-gray-800 break-all whitespace-pre-wrap">
                                  {getEndpointUrl(selectedEndpoint, true)}
                                </code>
                                <button
                                  onClick={() => {
                                    const urlWithParams = getEndpointUrl(selectedEndpoint, true)
                                    copyToClipboard(urlWithParams, 'url')
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                                  title="Copy URL with query parameters"
                                >
                                  {copiedType === 'url' ? (
                                    <>
                                      <Check size={18} />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={18} />
                                      Copy URL
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Query parameters breakdown */}
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Available Query Parameters (Filterable Fields):
                              </label>
                              <div className="bg-white border border-green-300 rounded p-3 space-y-2">
                                {(() => {
                                  const filterableFields = selectedEndpoint.fields.filter(f => f.filterable);
                                  if (filterableFields.length === 0) {
                                    return (
                                      <p className="text-xs text-gray-500 italic">
                                        No filterable fields defined. Mark fields as "Filterable" in the endpoint form to use them in query parameters.
                                      </p>
                                    );
                                  }
                                  return filterableFields.slice(0, 5).map((field, idx) => {
                                    const exampleValue = generateQueryParamValue(field);
                                    return (
                                      <div key={idx} className="text-xs font-mono">
                                        <span className="text-green-700 font-semibold">?{field.name}</span>
                                        <span className="text-gray-500">=</span>
                                        <span className="text-gray-700">{exampleValue}</span>
                                        {field.type && (
                                          <span className="text-gray-400 ml-2">({field.type}{field.format ? `, ${field.format}` : ''})</span>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                                {selectedEndpoint.fields.filter(f => f.filterable).length > 5 && (
                                  <p className="text-xs text-gray-500 italic">
                                    ... and {selectedEndpoint.fields.filter(f => f.filterable).length - 5} more filterable field(s)
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Example cURL with query params */}
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Example cURL with Query Parameters:
                              </label>
                              <div className="flex items-start gap-2">
                                <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-gray-800 break-all whitespace-pre-wrap">
                                  {getCurlCommand(selectedEndpoint, true)}
                                </code>
                                <button
                                  onClick={() => {
                                    const curlWithParams = getCurlCommand(selectedEndpoint, true)
                                    copyToClipboard(curlWithParams, 'curl')
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                                  title="Copy cURL with query parameters"
                                >
                                  {copiedType === 'curl' ? (
                                    <>
                                      <Check size={18} />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={18} />
                                      Copy cURL
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 mt-2">
                            💡 GET endpoints use query parameters for filtering. Add query parameters to the URL (e.g., <code className="bg-white px-1 rounded">?id=123&dateOfBirth=1990-01-01</code>) to filter results. Click "Regenerate" for new example values.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600">
                            ℹ️ Example JSON body is only available for POST and PUT endpoints. GET and DELETE endpoints don't require a request body.
                            {selectedEndpoint.method === 'GET' && (!selectedEndpoint.fields || selectedEndpoint.fields.length === 0) && (
                              <> Add fields to this GET endpoint to see query parameter examples.</>
                            )}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        💡 Copy the URL or cURL command to test in Postman, Insomnia, or any API client. 
                        {storageMode === 'browser' && ' Note: This requires a backend server to be running (see backend setup in README).'}
                      </p>
                    </div>
                  </div>

                  <EndpointTester
                    endpoint={selectedEndpoint}
                    onDataUpdate={handleGenerateSampleData}
                  />

                  {/* Request Log - Shows GET/POST requests from Postman */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <RequestLog requestLogs={selectedEndpoint.requestLogs || []} />
                  </div>

                  {/* Data Table - Shows stored data that can be retrieved/managed */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <DataTable
                      endpoint={selectedEndpoint}
                      onDataUpdate={handleGenerateSampleData}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                      No endpoint selected
                    </h2>
                    <p className="text-gray-500 mb-4">
                      Select an endpoint from the sidebar or create a new one
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Endpoint
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default MockAPIBuilder
