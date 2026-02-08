import { useState, useEffect } from 'react'
import { Trash2, Database, Sparkles, RefreshCw, Trash } from 'lucide-react'
import { getEndpoints, deleteData, addData, saveEndpoints } from '../services/apiService'
import { generateMockData } from '../utils/mockDataGenerator'

// Check if backend is available
const checkBackend = async () => {
  try {
    const response = await fetch('http://localhost:3000/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    })
    return response.ok
  } catch {
    return false
  }
}

function DataTable({ endpoint, onDataUpdate }) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState(new Set())
  
  // Safety check
  if (!endpoint) {
    return <div className="p-4 text-gray-500">No endpoint selected</div>
  }
  
  // Auto-refresh data every 1 second to sync with Postman (faster for better sync)
  useEffect(() => {
    if (!onDataUpdate || !endpoint) return
    
    const interval = setInterval(async () => {
      try {
        await onDataUpdate(endpoint)
      } catch (error) {
        console.error('Error refreshing data:', error)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [endpoint?.id, onDataUpdate]) // Depend on both endpoint ID and onDataUpdate
  
  const handleRefresh = async () => {
    setRefreshing(true)
    console.log('Manual refresh triggered for endpoint:', endpoint.name)
    if (onDataUpdate) {
      await onDataUpdate(endpoint)
      // Force another refresh after a delay
      setTimeout(async () => {
        if (onDataUpdate) {
          await onDataUpdate(endpoint)
        }
      }, 500)
    }
    setTimeout(() => setRefreshing(false), 1000)
  }

  const deleteRecordFromBackend = async (recordId) => {
    const available = await checkBackend()
    if (!available) return false
    
    try {
      const normalizedPath = endpoint.path.startsWith('/api/') 
        ? endpoint.path.substring(4) 
        : endpoint.path
      
      const response = await fetch(`http://localhost:3000/api${normalizedPath}?id=${recordId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      return response.ok
    } catch (error) {
      console.error('Error deleting from backend:', error)
      return false
    }
  }

  const handleDelete = async (recordId) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return
    }
    
    try {
      // Delete from backend first
      await deleteRecordFromBackend(recordId)
      
      // Also delete from localStorage
      await deleteData(endpoint.id, recordId)
      
      // Force immediate refresh
      if (onDataUpdate) {
        await new Promise(resolve => setTimeout(resolve, 200))
        await onDataUpdate(endpoint)
        setTimeout(async () => {
          if (onDataUpdate) {
            await onDataUpdate(endpoint)
          }
        }, 800)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Error deleting record: ' + error.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) {
      alert('Please select at least one record to delete')
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedRecords.size} record(s)?`)) {
      return
    }
    
    try {
      setLoading(true)
      const recordIds = Array.from(selectedRecords)
      console.log('Deleting records:', recordIds)
      
      // Delete from backend first
      const available = await checkBackend()
      if (available) {
        const normalizedPath = endpoint.path.startsWith('/api/') 
          ? endpoint.path.substring(4) 
          : endpoint.path
        
        // Delete each record from backend sequentially
        for (const recordId of recordIds) {
          try {
            const response = await fetch(`http://localhost:3000/api${normalizedPath}?id=${recordId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' }
            })
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`Failed to delete record ${recordId}:`, response.status, errorText)
            } else {
              console.log(`Successfully deleted record ${recordId} from backend`)
            }
          } catch (error) {
            console.error(`Error deleting record ${recordId} from backend:`, error)
          }
          // Small delay between deletes
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      // Delete from localStorage
      for (const recordId of recordIds) {
        await deleteData(endpoint.id, recordId)
      }
      
      // Clear selection
      setSelectedRecords(new Set())
      
      // Force refresh multiple times to ensure sync
      if (onDataUpdate) {
        await new Promise(resolve => setTimeout(resolve, 300))
        await onDataUpdate(endpoint)
        setTimeout(async () => {
          if (onDataUpdate) {
            await onDataUpdate(endpoint)
          }
        }, 800)
        setTimeout(async () => {
          if (onDataUpdate) {
            await onDataUpdate(endpoint)
          }
        }, 1500)
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert('Error deleting records: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRecord = (recordId) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRecords.size === data.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(data.map(r => r.id)))
    }
  }

  const handleGenerateSample = async () => {
    setLoading(true)
    try {
      const mockRecords = generateMockData(endpoint, 7)
      const endpoints = await getEndpoints()
      const currentEndpoint = endpoints.find(e => e.id === endpoint.id)
      
      // Add each mock record
      for (const record of mockRecords) {
        await addData(endpoint.id, record)
      }
      
      if (onDataUpdate) {
        await onDataUpdate(endpoint)
      }
    } catch (error) {
      alert('Error generating sample data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-'
      }
      return date.toLocaleString()
    } catch {
      return '-'
    }
  }

  // Get data - show all records that have actual field values
  const allData = endpoint?.data || []
  const fields = endpoint?.fields || []
  
  // Debug: Log what we're getting
  console.log('DataTable received endpoint:', {
    name: endpoint?.name,
    dataCount: allData.length,
    fieldsCount: fields.length,
    firstRecord: allData[0] || null
  })
  
  const data = allData.filter(record => {
    // Only filter out null/undefined or completely empty objects
    if (!record || typeof record !== 'object') return false
    
    // If we have fields defined, check if record has values for those fields
    if (fields.length > 0) {
      const hasValue = fields.some(field => {
        const value = record[field.name]
        return value !== null && value !== undefined && value !== ''
      })
      if (!hasValue) {
        console.log('Record filtered out (no field values):', record)
      }
      return hasValue
    }
    
    // If no fields defined, keep if it has id or any other keys
    if (record.id) return true
    const keys = Object.keys(record).filter(k => k !== 'id' && k !== 'createdAt')
    return keys.length > 0
  })
  
  console.log('DataTable filtered data:', {
    allCount: allData.length,
    filteredCount: data.length,
    fields: fields.map(f => f.name)
  })
  
  // Debug logging
  useEffect(() => {
    console.log('📊 DataTable - Endpoint:', endpoint.name)
    console.log('  - All data count:', allData.length)
    console.log('  - Filtered data count:', data.length)
    console.log('  - Fields count:', fields.length)
    if (allData.length > 0) {
      console.log('  - First record keys:', Object.keys(allData[0]))
      console.log('  - First record:', JSON.stringify(allData[0], null, 2))
    }
    if (allData.length > 0 && data.length === 0) {
      console.warn('  - ⚠️ WARNING: All data filtered out!')
      console.warn('  - Fields expected:', fields.map(f => f.name))
      console.warn('  - Record has:', Object.keys(allData[0]))
    }
  }, [endpoint.id, endpoint.name, data.length, allData.length, fields.length])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Database size={20} />
          Data Records
          {selectedRecords.size > 0 && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              ({selectedRecords.size} selected)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {selectedRecords.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              title="Delete selected records"
            >
              <Trash size={18} />
              Delete Selected ({selectedRecords.size})
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh data from server"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleGenerateSample}
            disabled={loading || fields.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} />
            {loading ? 'Generating...' : 'Generate Sample Data'}
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Database className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600 font-medium mb-1">No data yet</p>
          <p className="text-gray-500 text-sm mb-4">
            {fields.length === 0
              ? 'Add fields to your endpoint first, then generate sample data or test the endpoint'
              : 'Generate sample data or test the endpoint to create records'}
          </p>
          {fields.length > 0 && (
            <button
              onClick={handleGenerateSample}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Generate Sample Data
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRecords.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    title="Select all"
                  />
                </th>
                {fields.map((field) => (
                  <th
                    key={field.name}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {field.name}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((record) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedRecords.has(record.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  {fields.map((field) => (
                    <td key={field.name} className="px-4 py-3 text-sm text-gray-700">
                      <div className="max-w-xs truncate" title={formatValue(record[field.name])}>
                        {formatValue(record[field.name])}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(record.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {data.length} record{data.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default DataTable
