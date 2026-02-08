import { useState, useEffect } from 'react'
import { RefreshCw, Trash2, Database, Edit, Plus, X, Check } from 'lucide-react'
import { getTables } from '../services/apiService'

function TableView({ table, onRefresh, onDelete, onEdit, endpoints = [] }) {
  const [refreshing, setRefreshing] = useState(false)
  const [tableData, setTableData] = useState(table)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingFields, setEditingFields] = useState(false)
  const [localFields, setLocalFields] = useState(table?.fields || [])
  const [selectedEndpoints, setSelectedEndpoints] = useState(
    new Set(table?.endpoints?.map(e => e.id) || [])
  )

  useEffect(() => {
    setTableData(table)
    setLocalFields(table?.fields || [])
    // Only update selectedEndpoints if we're not currently editing (to prevent overwriting user selections)
    if (!showEditForm) {
      setSelectedEndpoints(new Set(table?.endpoints?.map(e => e.id) || []))
    }
  }, [table, showEditForm])

  const handleRefresh = async () => {
    // Don't refresh if edit form is open to prevent overwriting user selections
    if (showEditForm) {
      return
    }
    setRefreshing(true)
    try {
      const tables = await getTables()
      const updated = tables.find(t => t.id === table.id)
      if (updated) {
        console.log('Refreshed table data:', updated.name, 'endpoints:', updated.endpoints?.length)
        setTableData(updated)
        // Always update selectedEndpoints when edit form is closed to reflect saved state
        if (!showEditForm) {
          const endpointIds = new Set(updated?.endpoints?.map(e => e.id) || [])
          console.log('Updating selectedEndpoints from refreshed data:', Array.from(endpointIds))
          setSelectedEndpoints(endpointIds)
        }
        if (onRefresh) onRefresh()
      }
    } catch (error) {
      console.error('Error refreshing table:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh()
    }, 1000)
    return () => clearInterval(interval)
  }, [table?.id])

  if (!tableData) {
    return <div className="p-4 text-gray-500">No table data</div>
  }

  // Use table's own fields if defined, otherwise derive from endpoints/data
  let fieldNames = []
  if (tableData.fields && tableData.fields.length > 0) {
    // Use table's defined fields
    fieldNames = tableData.fields.map(f => f.name)
  } else {
    // Fallback: Get all unique field names from all associated endpoints
    const allFields = new Set()
    tableData.endpoints?.forEach(ep => {
      ep.fields?.forEach(field => {
        allFields.add(field.name)
      })
    })

    // Also include any fields found in the data
    tableData.data?.forEach(record => {
      Object.keys(record).forEach(key => {
        if (key !== 'id' && key !== 'createdAt') {
          allFields.add(key)
        }
      })
    })

    fieldNames = Array.from(allFields)
  }
  const data = tableData.data || []

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return timestamp
      return date.toLocaleString()
    } catch {
      return timestamp
    }
  }

  const addField = () => {
    setLocalFields([...localFields, { name: '', type: 'string', required: false, format: '' }])
  }

  const removeField = (index) => {
    setLocalFields(localFields.filter((_, i) => i !== index))
  }

  const updateField = (index, updates) => {
    const updated = [...localFields]
    updated[index] = { ...updated[index], ...updates }
    setLocalFields(updated)
  }

  const handleSaveFields = async () => {
    if (onEdit) {
      await onEdit(tableData.id, { fields: localFields })
      setEditingFields(false)
      if (onRefresh) onRefresh()
    }
  }

  const handleSaveEndpoints = async () => {
    if (onEdit) {
      await onEdit(tableData.id, { endpointIds: Array.from(selectedEndpoints) })
      if (onRefresh) onRefresh()
    }
  }

  const handleSaveAll = async () => {
    if (onEdit) {
      try {
        const endpointIdsArray = Array.from(selectedEndpoints)
        console.log('Saving table:', tableData.id, {
          fields: localFields.length,
          endpointIds: endpointIdsArray,
          endpointIdsType: typeof endpointIdsArray,
          endpointIdsLength: endpointIdsArray.length
        })
        // Save both fields and endpoints
        const result = await onEdit(tableData.id, { 
          fields: localFields,
          endpointIds: endpointIdsArray
        })
        console.log('Save result:', result)
        setEditingFields(false)
        setShowEditForm(false)
        // Wait a moment for backend to fully persist
        await new Promise(resolve => setTimeout(resolve, 500))
        // Force refresh to get updated data - this will update selectedEndpoints from backend
        await handleRefresh()
        // Also manually refresh the table data to ensure it's up to date
        const tables = await getTables()
        const updated = tables.find(t => t.id === tableData.id)
        if (updated) {
          console.log('Manually refreshed after save - endpoints:', updated.endpoints?.length, updated.endpoints?.map(e => e.id))
          setTableData(updated)
          setSelectedEndpoints(new Set(updated?.endpoints?.map(e => e.id) || []))
        }
        if (onRefresh) onRefresh()
      } catch (error) {
        console.error('Error saving table:', error)
        alert('Error saving table: ' + error.message)
      }
    }
  }

  const toggleEndpoint = (endpointId) => {
    const newSet = new Set(selectedEndpoints)
    if (newSet.has(endpointId)) {
      newSet.delete(endpointId)
    } else {
      newSet.add(endpointId)
    }
    setSelectedEndpoints(newSet)
  }

  const getMethodColor = (method) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5" />
            {tableData.name}
          </h3>
          {tableData.description && (
            <p className="text-sm text-gray-500 mt-1">{tableData.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{data.length} record(s)</span>
            {tableData.fields && tableData.fields.length > 0 && (
              <>
                <span>•</span>
                <span>{tableData.fields.length} field(s)</span>
              </>
            )}
            {tableData.endpoints && tableData.endpoints.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {tableData.endpoints.length} endpoint(s):
                  {tableData.endpoints.map((e, idx) => (
                    <span key={e.id} className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                      e.method === 'GET' ? 'bg-green-100 text-green-800' :
                      e.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      e.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      e.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {e.method} {e.path}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="Edit table"
            >
              <Edit size={16} />
              Edit
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Refresh table data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete the table "${tableData.name}"?`)) {
                  onDelete(tableData.id)
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              title="Delete table"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Edit Form - Fields and Endpoints */}
      {showEditForm && onEdit && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          {/* Save All & Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-300">
            <h4 className="text-sm font-semibold text-gray-700">Edit Table Configuration</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Check size={16} />
                Save & Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setEditingFields(false)
                  setLocalFields(tableData.fields || [])
                  setSelectedEndpoints(new Set(tableData.endpoints?.map(e => e.id) || []))
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
          {/* Fields Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Table Fields
              </label>
              <div className="flex items-center gap-2">
                {!editingFields ? (
                  <button
                    type="button"
                    onClick={() => setEditingFields(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    <Edit size={14} />
                    Edit Fields
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveFields}
                      className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFields(false)
                        setLocalFields(tableData.fields || [])
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingFields ? (
              <div className="space-y-2">
                {localFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      placeholder="Field name"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value, format: '' })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {['string', 'number', 'boolean', 'date', 'object', 'array'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {(field.type === 'string' || field.type === 'date') && (
                      <input
                        type="text"
                        value={field.format || ''}
                        onChange={(e) => updateField(index, { format: e.target.value })}
                        placeholder="Format"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Req
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addField}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  <Plus size={14} />
                  Add Field
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {localFields.length > 0 ? (
                  localFields.map((field, index) => (
                    <div key={index} className="text-sm text-gray-700 bg-white p-2 rounded border">
                      <span className="font-medium">{field.name}</span>
                      <span className="text-gray-500 ml-2">({field.type})</span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.format && <span className="text-gray-400 ml-1">- {field.format}</span>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No fields defined</p>
                )}
              </div>
            )}
          </div>

          {/* Endpoints Association */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Associate Endpoints
              </label>
            </div>
            {endpoints.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {endpoints.map((endpoint) => (
                  <label
                    key={endpoint.id}
                    className="flex items-center gap-3 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEndpoints.has(endpoint.id)}
                      onChange={() => toggleEndpoint(endpoint.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {endpoint.name}
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                          endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {endpoint.method}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{endpoint.path}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No endpoints available</p>
            )}
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No data yet. Post data to associated endpoints to see it here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                {fieldNames.map((field) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {field}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((record) => {
                // Create a case-insensitive lookup map for record fields
                const recordKeysMap = new Map();
                Object.keys(record).forEach(key => {
                  recordKeysMap.set(key.toLowerCase(), key);
                });
                
                // Debug: Log record structure
                if (data.indexOf(record) === 0) {
                  console.log('TableView - First record:', record);
                  console.log('TableView - Field names:', fieldNames);
                  console.log('TableView - Record keys:', Object.keys(record));
                }
                
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {fieldNames.map((field) => {
                      // Try exact match first, then case-insensitive match
                      let recordKey = record[field];
                      let value = recordKey;
                      
                      if (value === undefined) {
                        // Try case-insensitive match
                        recordKey = recordKeysMap.get(field.toLowerCase());
                        value = recordKey ? record[recordKey] : undefined;
                      }
                      
                      // Debug first record
                      if (data.indexOf(record) === 0 && value === undefined) {
                        console.log(`TableView - Field "${field}" not found in record. Available keys:`, Object.keys(record));
                      }
                      
                      return (
                        <td key={field} className="px-4 py-3 text-sm text-gray-900">
                          {formatValue(value)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(record.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TableView
