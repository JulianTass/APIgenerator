import { useState } from 'react'
import { Trash2, Circle, Database, Server, Search, X } from 'lucide-react'

function Sidebar({ 
  endpoints, 
  selectedEndpoint, 
  onSelectEndpoint, 
  onDeleteEndpoint,
  tables = [],
  selectedTable,
  onSelectTable,
  onDeleteTable,
  viewMode = 'endpoints'
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const getMethodColor = (method) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 text-green-800'
      case 'POST':
        return 'bg-blue-100 text-blue-800'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter endpoints based on search
  const filteredEndpoints = endpoints.filter(endpoint => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      endpoint.name?.toLowerCase().includes(query) ||
      endpoint.path?.toLowerCase().includes(query) ||
      endpoint.method?.toLowerCase().includes(query)
    )
  })

  // Filter tables based on search
  const filteredTables = tables.filter(table => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      table.name?.toLowerCase().includes(query) ||
      table.description?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={viewMode === 'endpoints' ? 'Search endpoints...' : 'Search tables...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Endpoints Section */}
      {viewMode === 'endpoints' && (
        <>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Endpoints</h2>
            </div>
            <p className="text-xs text-gray-500">
              {filteredEndpoints.length} {searchQuery ? 'found' : 'total'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredEndpoints.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No endpoints found' : 'No endpoints yet. Create one to get started!'}
              </div>
            ) : (
              <div className="p-2">
                {filteredEndpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    onClick={() => onSelectEndpoint(endpoint)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                      selectedEndpoint?.id === endpoint.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${getMethodColor(
                              endpoint.method
                            )}`}
                          >
                            {endpoint.method}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {endpoint.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{endpoint.path}</p>
                        {endpoint.data && (
                          <p className="text-xs text-gray-400 mt-1">
                            {endpoint.data.length} records
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteEndpoint(endpoint.id)
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete endpoint"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tables Section */}
      {viewMode === 'tables' && (
        <>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Tables</h2>
            </div>
            <p className="text-xs text-gray-500">
              {filteredTables.length} {searchQuery ? 'found' : 'total'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTables.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No tables found' : 'No tables yet. Create one to get started!'}
              </div>
            ) : (
              <div className="p-2">
                {filteredTables.map((table) => (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTable?.id === table.id
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Database className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {table.name}
                          </span>
                        </div>
                        {table.description && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {table.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {table.fields && (
                            <span>{table.fields.length} fields</span>
                          )}
                          {table.data && (
                            <span>{table.data.length} records</span>
                          )}
                          {table.endpoints && (
                            <span>{table.endpoints.length} endpoints</span>
                          )}
                        </div>
                      </div>
                      {onDeleteTable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteTable(table.id)
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete table"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Sidebar
