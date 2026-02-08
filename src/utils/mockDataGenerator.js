// Mock Data Generator
// Generates realistic sample data based on field types

const generateStringValue = (fieldName, format = '') => {
  const name = fieldName.toLowerCase();
  const formatLower = format.toLowerCase().trim();
  
  // Format-based generation
  if (formatLower === 'email' || name.includes('email')) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'diana', 'eve', 'frank'];
    return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }
  
  if (formatLower === 'url' || formatLower === 'website') {
    const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
    return `https://www.${domains[Math.floor(Math.random() * domains.length)]}`;
  }
  
  if (formatLower === 'phone') {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  
  // Email (by name detection)
  if (name.includes('email')) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'diana', 'eve', 'frank'];
    return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }
  
  // Name
  if (name.includes('name') || name.includes('firstname') || name.includes('lastname')) {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    if (name.includes('first')) return firstNames[Math.floor(Math.random() * firstNames.length)];
    if (name.includes('last')) return lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }
  
  // Title
  if (name.includes('title')) {
    const titles = ['Software Engineer', 'Product Manager', 'Designer', 'Developer', 'Manager', 'Analyst', 'Director', 'Lead'];
    return titles[Math.floor(Math.random() * titles.length)];
  }
  
  // Description
  if (name.includes('description') || name.includes('desc')) {
    const descriptions = [
      'A comprehensive solution for modern needs',
      'High-quality product with excellent features',
      'Designed for optimal performance',
      'User-friendly interface with advanced capabilities',
      'Reliable and efficient solution'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
  
  // Address
  if (name.includes('address')) {
    const streets = ['Main St', 'Oak Ave', 'Park Blvd', 'Elm St', 'Maple Dr'];
    return `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`;
  }
  
  // City
  if (name.includes('city')) {
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
    return cities[Math.floor(Math.random() * cities.length)];
  }
  
  // Phone
  if (name.includes('phone')) {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  
  // URL
  if (name.includes('url') || name.includes('website')) {
    const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
    return `https://www.${domains[Math.floor(Math.random() * domains.length)]}`;
  }
  
  // Default string
  return `Sample ${fieldName} ${Math.floor(Math.random() * 1000)}`;
};

const generateNumberValue = (fieldName) => {
  const name = fieldName.toLowerCase();
  
  if (name.includes('age')) {
    return Math.floor(Math.random() * 50) + 18;
  }
  
  if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
    return Math.floor(Math.random() * 10000) / 100;
  }
  
  if (name.includes('quantity') || name.includes('count') || name.includes('stock')) {
    return Math.floor(Math.random() * 100);
  }
  
  if (name.includes('rating') || name.includes('score')) {
    return Math.floor(Math.random() * 5) + 1;
  }
  
  return Math.floor(Math.random() * 1000);
};

const generateBooleanValue = () => {
  return Math.random() > 0.5;
};

const generateDateValue = (format = '') => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  
  // Apply format if specified
  if (format) {
    const formatLower = format.toLowerCase().trim();
    
    // ISO format (default)
    if (formatLower === 'iso' || formatLower === 'iso8601') {
      return date.toISOString();
    }
    
    // Unix timestamp
    if (formatLower.includes('unix') || formatLower.includes('timestamp')) {
      return Math.floor(date.getTime() / 1000);
    }
    
    // YYYY-MM-DD
    if (formatLower.includes('yyyy-mm-dd') || formatLower === 'yyyy-mm-dd') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // MM/DD/YYYY
    if (formatLower.includes('mm/dd/yyyy') || formatLower === 'mm/dd/yyyy') {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
    
    // DD-MM-YYYY
    if (formatLower.includes('dd-mm-yyyy') || formatLower === 'dd-mm-yyyy') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    // Custom format parsing (basic)
    let formatted = format;
    formatted = formatted.replace(/yyyy/gi, date.getFullYear());
    formatted = formatted.replace(/mm/gi, String(date.getMonth() + 1).padStart(2, '0'));
    formatted = formatted.replace(/dd/gi, String(date.getDate()).padStart(2, '0'));
    formatted = formatted.replace(/hh/gi, String(date.getHours()).padStart(2, '0'));
    formatted = formatted.replace(/mi/gi, String(date.getMinutes()).padStart(2, '0'));
    formatted = formatted.replace(/ss/gi, String(date.getSeconds()).padStart(2, '0'));
    return formatted;
  }
  
  // Default to ISO
  return date.toISOString();
};

const generateObjectValue = (fields) => {
  const obj = {};
  fields.forEach(field => {
    obj[field.name] = generateValueByType(field.type, field.name, field.fields, field.format || '');
  });
  return obj;
};

const generateArrayValue = (itemType, fieldName) => {
  const length = Math.floor(Math.random() * 5) + 1;
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(generateValueByType(itemType, fieldName));
  }
  return arr;
};

const generateValueByType = (type, fieldName, fields = null, format = '') => {
  switch (type) {
    case 'string':
      return generateStringValue(fieldName, format);
    case 'number':
      return generateNumberValue(fieldName);
    case 'boolean':
      return generateBooleanValue();
    case 'date':
      return generateDateValue(format);
    case 'object':
      return generateObjectValue(fields || []);
    case 'array':
      return generateArrayValue('string', fieldName);
    default:
      return `Sample ${fieldName}`;
  }
};

export const generateMockData = (endpoint, count = 5) => {
  const records = [];
  const recordCount = Math.min(Math.max(count, 5), 10);
  
  for (let i = 0; i < recordCount; i++) {
    const record = {};
    endpoint.fields.forEach(field => {
      record[field.name] = generateValueByType(field.type, field.name, field.fields, field.format || '');
    });
    records.push(record);
  }
  
  return records;
};

// Generate a single record for JSON testing
export const generateSingleRecord = (endpoint) => {
  const record = {};
  endpoint.fields.forEach(field => {
    record[field.name] = generateValueByType(field.type, field.name, field.fields, field.format || '');
  });
  return record;
};
