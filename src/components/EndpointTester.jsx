import { useState } from 'react'
import { Send, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
import { getEndpoints, addData, saveEndpoints } from '../services/apiService'
import { generateSingleRecord } from '../utils/mockDataGenerator'

function EndpointTester({ endpoint, onDataUpdate }) {
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Safety check
  if (!endpoint || !endpoint.id) {
    return <div className="p-4 text-gray-500">No endpoint selected</div>
  }

  const validateJSON = (jsonString) => {
    try {
      if (!jsonString.trim()) return { valid: true, data: null }
      return { valid: true, data: JSON.parse(jsonString) }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }

  const validateRequiredFields = (data, fields) => {
    const missing = []
    fields.forEach((field) => {
      if (field.required && (data[field.name] === undefined || data[field.name] === null || data[field.name] === '')) {
        missing.push(field.name)
      }
    })
    return missing
  }

  const handleSendRequest = async () => {
    setError(null)
    setResponse(null)
    setLoading(true)

    try {
      // For POST/PUT, send to backend API
      if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
        const validation = validateJSON(requestBody)
        if (!validation.valid) {
          setError(`Invalid JSON: ${validation.error}`)
          setLoading(false)
          return
        }

        const data = validation.data
        if (!data) {
          setError('Request body cannot be empty for POST/PUT requests')
          setLoading(false)
          return
        }

        // Validate required fields
        const missing = validateRequiredFields(data, endpoint.fields)
        if (missing.length > 0) {
          setError(`Missing required fields: ${missing.join(', ')}`)
          setLoading(false)
          return
        }

        // Try to send to backend first
        try {
          const normalizedPath = endpoint.path.startsWith('/api/') 
            ? endpoint.path.substring(4) 
            : endpoint.path
          const response = await fetch(`http://localhost:3000/api${normalizedPath}`, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          if (response.ok) {
            const backendRecord = await response.json()
            setResponse({
              status: response.status,
              data: backendRecord,
              message: 'Record created successfully'
            })
            setRequestBody('')
            
            // Also add to local storage via addData
            await addData(endpoint.id, data)
            
            // Notify parent to refresh
            if (onDataUpdate) {
              await onDataUpdate(endpoint)
            }
            return
          } else {
            const errorData = await response.json()
            setError(errorData.error || 'Request failed')
            setLoading(false)
            return
          }
        } catch (fetchError) {
          // Fallback to localStorage if backend unavailable
          console.warn('Backend unavailable, using localStorage:', fetchError)
        }

        // Fallback: Add data to endpoint (localStorage)
        const newRecord = await addData(endpoint.id, data)
        setResponse({
          status: 201,
          data: newRecord,
          message: 'Record created successfully (local storage)'
        })
        setRequestBody('')
        
        // Notify parent to refresh
        if (onDataUpdate) {
          await onDataUpdate(endpoint)
        }
      } else {
        // GET request - fetch from backend or localStorage
        try {
          const normalizedPath = endpoint.path.startsWith('/api/') 
            ? endpoint.path.substring(4) 
            : endpoint.path
          const response = await fetch(`http://localhost:3000/api${normalizedPath}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (response.ok) {
            const backendData = await response.json()
            setResponse({
              status: 200,
              data: backendData,
              message: `Retrieved ${backendData.length} records`
            })
            return
          }
        } catch (fetchError) {
          console.warn('Backend unavailable, using localStorage:', fetchError)
        }
        
        // Fallback to localStorage
        const endpoints = await getEndpoints()
        const currentEndpoint = endpoints.find(e => e.id === endpoint.id)
        setResponse({
          status: 200,
          data: currentEndpoint?.data || [],
          message: `Retrieved ${currentEndpoint?.data?.length || 0} records`
        })
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateJSON = () => {
    if (endpoint.fields.length === 0) {
      setError('No fields defined for this endpoint')
      return
    }
    const sampleData = generateSingleRecord(endpoint)
    setRequestBody(JSON.stringify(sampleData, null, 2))
    setError(null)
  }

  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Endpoint</h3>
      
      <div className="space-y-4">
        {/* Request Body for POST/PUT */}
        {(endpoint.method === 'POST' || endpoint.method === 'PUT') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Request Body (JSON)
              </label>
              <button
                type="button"
                onClick={handleGenerateJSON}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                title="Auto-generate JSON based on endpoint fields"
              >
                <Sparkles size={16} />
                Generate JSON
              </button>
            </div>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full h-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder={`{\n  "field1": "value1",\n  "field2": "value2"\n}`}
            />
            {endpoint.fields.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-medium mb-1">Available fields:</p>
                <div className="flex flex-wrap gap-2">
                  {endpoint.fields.map((field) => (
                    <span
                      key={field.name}
                      className={`px-2 py-1 rounded ${
                        field.required
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {field.name} ({field.type})
                      {field.required && ' *'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendRequest}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
          {loading ? 'Sending...' : 'Send Request'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={18} />
                <span className="text-sm font-medium text-gray-700">
                  Response ({response.status})
                </span>
              </div>
              <span className="text-xs text-gray-500">{response.message}</span>
            </div>
            <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-x-auto">
              <pre>{formatJSON(response.data)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EndpointTester
