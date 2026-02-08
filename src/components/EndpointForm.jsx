import { useState } from 'react'
import { X, Plus, Trash2, Database, Download } from 'lucide-react'

const FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'object', 'array']
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE']

function EndpointForm({ onSubmit, onCancel, tables = [], initialData = null }) {
  // Find which table this endpoint is associated with (if editing)
  const associatedTableId = initialData ? (() => {
    // Check if this endpoint is associated with any table
    const table = tables.find(t => t.endpoints?.some(e => e.id === initialData.id));
    return table?.id || '';
  })() : '';
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    path: initialData?.path || '',
    method: initialData?.method || 'GET',
    fields: initialData?.fields || [],
    tableId: associatedTableId || '' // Add table association
  });

  const [errors, setErrors] = useState({})

  const validatePath = (path) => {
    if (!path) return 'Path is required'
    if (!path.startsWith('/')) return 'Path must start with /'
    if (!/^\/[a-zA-Z0-9\/\-_]*$/.test(path)) {
      return 'Path can only contain letters, numbers, /, -, and _'
    }
    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    const pathError = validatePath(formData.path)
    if (pathError) {
      newErrors.path = pathError
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
  }

  const addField = () => {
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        { name: '', type: 'string', required: false, format: '', filterable: formData.method === 'GET' }
      ]
    })
  }

  const removeField = (index) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index)
    })
  }

  const updateField = (index, updates) => {
    const newFields = [...formData.fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFormData({ ...formData, fields: newFields })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? 'Edit Endpoint' : 'Create New Endpoint'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Associate with Table */}
        {tables.length > 0 && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-purple-900">
                <Database className="inline w-4 h-4 mr-2" />
                Associate with Table (Optional)
              </label>
            </div>
            <p className="text-xs text-purple-700 mb-3">
              Select a table to associate this endpoint with. This allows the table to display data from this endpoint.
            </p>
            <select
              value={formData.tableId}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  tableId: e.target.value
                })
              }}
              className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="">-- No table association --</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.endpoints?.length || 0} endpoint(s))
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Import Fields from Table */}
        {tables.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-blue-900">
                <Database className="inline w-4 h-4 mr-2" />
                Import Fields from Existing Table (Optional)
              </label>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Select a table to automatically import its fields into this endpoint. This is useful when creating GET endpoints that return customer information.
            </p>
            <select
              onChange={(e) => {
                const tableId = e.target.value
                if (tableId) {
                  const selectedTable = tables.find(t => t.id === tableId)
                  if (selectedTable && selectedTable.fields && selectedTable.fields.length > 0) {
                    setFormData({
                      ...formData,
                      fields: selectedTable.fields.map(f => ({ ...f }))
                    })
                  }
                }
                e.target.value = '' // Reset select
              }}
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select a table to import fields --</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.fields?.length || 0} fields)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Users API"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTTP Method *
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Path *
          </label>
          <input
            type="text"
            value={formData.path}
            onChange={(e) => setFormData({ ...formData, path: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.path ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., /users or /products"
          />
          {errors.path && (
            <p className="mt-1 text-sm text-red-600">{errors.path}</p>
          )}
        </div>

        {/* Fields */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Fields
            </label>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          {formData.fields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 text-sm">No fields added yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Click "Add Field" to define the data structure
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 space-y-3">
                    <div className={`grid gap-3 ${formData.method === 'GET' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.name || ''}
                          onChange={(e) =>
                            updateField(index, { name: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., name, email"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type || 'string'}
                          onChange={(e) =>
                            updateField(index, { type: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) =>
                              updateField(index, { required: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-gray-600">
                            Required
                          </span>
                        </label>
                      </div>
                      {formData.method === 'GET' && (
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.filterable || false}
                              onChange={(e) =>
                                updateField(index, { filterable: e.target.checked })
                              }
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-xs font-medium text-gray-600" title="Allow filtering by this field in query parameters (e.g., ?id=123)">
                              Filterable
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                    {/* Format field - shown for date and string types */}
                    {(field.type === 'date' || field.type === 'string') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Format {field.type === 'date' && '(e.g., YYYY-MM-DD, MM/DD/YYYY, ISO)'}
                          {field.type === 'string' && '(e.g., email, url, phone)'}
                        </label>
                        <input
                          type="text"
                          value={field.format || ''}
                          onChange={(e) =>
                            updateField(index, { format: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={field.type === 'date' ? 'YYYY-MM-DD or ISO' : 'email, url, phone, etc.'}
                        />
                        {field.type === 'date' && (
                          <p className="mt-1 text-xs text-gray-500">
                            Common formats: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, ISO (ISO8601), Unix timestamp
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove field"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {initialData ? 'Update Endpoint' : 'Create Endpoint'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EndpointForm
