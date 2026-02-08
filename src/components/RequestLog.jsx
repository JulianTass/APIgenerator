import { Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react'

function RequestLog({ requestLogs = [] }) {
  if (!requestLogs || requestLogs.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No requests yet. Make a request from Postman to see it here.</p>
      </div>
    )
  }

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch {
      return timestamp
    }
  }

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800'
      case 'POST': return 'bg-green-100 text-green-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Request History
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {requestLogs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(log.method)}`}>
                  {log.method}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(log.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {log.responseStatus >= 200 && log.responseStatus < 300 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500">{log.responseStatus}</span>
              </div>
            </div>
            
            {(log.method === 'POST' || log.method === 'PUT') && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <div className="text-xs text-gray-600 mb-1 font-semibold">Request Body:</div>
                {log.requestBody && Object.keys(log.requestBody).length > 0 ? (
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                ) : (
                  <div className="text-xs text-gray-400 italic">(empty)</div>
                )}
              </div>
            )}
            
            {log.method === 'GET' && log.responseData && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                <div className="text-xs text-gray-600 mb-1 font-semibold">Response ({Array.isArray(log.responseData) ? log.responseData.length : 1} items):</div>
                <div className="text-xs text-gray-700">
                  {Array.isArray(log.responseData) 
                    ? `${log.responseData.length} record(s) returned`
                    : 'Data returned'}
                </div>
              </div>
            )}
            
            {log.method === 'POST' && log.responseData && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                <div className="text-xs text-gray-600 mb-1 font-semibold">Created Record:</div>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(log.responseData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RequestLog
