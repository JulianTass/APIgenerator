# Mock API Builder

A powerful, browser-based tool for creating and testing mock API endpoints. Build, test, and manage your mock APIs with a beautiful, intuitive interface.

## Features

- ✅ **Create API Endpoints** - Define endpoints with custom paths, HTTP methods (GET/POST/PUT/DELETE), and field schemas
- ✅ **Dynamic Field Builder** - Add fields with types (string, number, boolean, date, object, array) and required flags
- ✅ **Request Tester** - Test your endpoints with built-in request interface
- ✅ **Data Table View** - View all stored data in a responsive table with delete functionality
- ✅ **Mock Data Generator** - Generate realistic sample data automatically
- ✅ **Export/Import** - Save and share your endpoint configurations as JSON
- ✅ **LocalStorage Persistence** - All data is automatically saved to browser storage
- ✅ **Backend-Ready** - Service layer prepared for easy backend integration

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **lucide-react** - Beautiful icon library

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Create an Endpoint**
   - Click "New Endpoint" button
   - Enter endpoint name, path (e.g., `/users`), and select HTTP method
   - Add fields with their types and required flags
   - Click "Create Endpoint"

2. **Test Your Endpoint**
   - Select an endpoint from the sidebar
   - For GET: Click "Send Request" to retrieve all data
   - For POST/PUT: Enter JSON body and click "Send Request"
   - View the response in the formatted JSON viewer

3. **View Data**
   - All data for the selected endpoint is displayed in the data table
   - Delete individual records using the trash icon
   - Generate sample data with the "Generate Sample Data" button

4. **Export/Import**
   - Click "Export" to download all endpoints as JSON
   - Click "Import" to upload and merge endpoints from a JSON file

## Project Structure

```
src/
├── components/
│   ├── MockAPIBuilder.jsx    # Main application component
│   ├── Sidebar.jsx           # Endpoint list sidebar
│   ├── EndpointForm.jsx      # Endpoint creation form
│   ├── EndpointTester.jsx    # Request testing interface
│   └── DataTable.jsx         # Data display table
├── services/
│   └── apiService.js         # Data access layer (localStorage/backend)
├── utils/
│   └── mockDataGenerator.js  # Mock data generation logic
├── App.jsx
├── main.jsx
└── index.css
```

## Backend Integration

The `apiService.js` file is structured to easily swap localStorage for backend API calls. Simply replace the localStorage operations with `fetch()` calls to your backend API.

## License

MIT
