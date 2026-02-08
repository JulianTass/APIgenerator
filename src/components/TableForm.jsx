import { useState } from 'react'
import { X, Check, Plus, Trash2 } from 'lucide-react'

function TableForm({ endpoints = [], onSubmit, onCancel, initialData = null }) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [fields, setFields] = useState(initialData?.fields || [])
  const [selectedEndpoints, setSelectedEndpoints] = useState(
    new Set(initialData?.endpoints?.map(e => e.id) || [])
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Table name is required')
      return
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      fields: fields,
      endpointIds: Array.from(selectedEndpoints)
    })
  }

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', required: false, format: '' }])
  }

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index, updates) => {
    const updated = [...fields]
    updated[index] = { ...updated[index], ...updates }
    setFields(updated)
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {initialData ? 'Edit Table' : 'Create New Table'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Table Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Identity Check, Booking Appointments"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this table represents..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fields Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Table Fields *
            </label>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-500 italic mb-2">
              No fields defined. Add at least one field to define the table structure.
            </p>
          ) : (
            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
              {fields.map((field, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="Field name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value, format: '' })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    {(field.type === 'string' || field.type === 'date') && (
                      <div className="col-span-3">
                        <select
                          value={field.format || ''}
                          onChange={(e) => updateField(index, { format: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">No format</option>
                          {field.type === 'string' ? (
                            <>
                              <option value="email">Email</option>
                              <option value="url">URL</option>
                              <option value="phone">Phone</option>
                            </>
                          ) : (
                            <>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                    <div className="col-span-1 flex items-center">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs text-gray-600">Required</span>
                      </label>
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Associate Multiple Endpoints (select GET, POST, PUT, DELETE endpoints that will update this table)
          </label>
          {endpoints.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No endpoints available. Create endpoints first.
            </p>
          ) : (
            <>
              <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {endpoints.map((endpoint) => (
                  <label
                    key={endpoint.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                      <div className="text-xs text-gray-500">
                        {endpoint.path}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedEndpoints.size > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {selectedEndpoints.size} endpoint(s) selected - This table will aggregate data from all selected endpoints
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check size={20} />
            {initialData ? 'Update Table' : 'Create Table'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default TableForm
