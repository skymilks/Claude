/**
 * Database seed script
 * Populates the database with realistic government contract data
 */

require('dotenv').config();
const { pool, initializeDatabase } = require('../src/config/database');

const contracts = [
  // Security Contracts
  {
    external_id: 'gov-sec-001',
    title: '24/7 Security Guard Services for Federal Building',
    description: 'Provision of professional security guard services including access control, patrol duties, CCTV monitoring, and incident response for a federal government facility. Services required include armed and unarmed security personnel with top-secret clearance.',
    department: 'Public Services and Procurement Canada',
    value: 850000,
    currency: 'CAD',
    status: 'active',
    category: 'security',
    keywords: ['security', 'guard', 'patrol', 'cctv', 'monitoring', 'access control', 'armed'],
    location: 'Ottawa, Ontario',
    close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-sec-002',
    title: 'Security System Installation and Maintenance',
    description: 'Supply and installation of modern surveillance and access control systems for government facilities. Includes CCTV camera installation, monitoring station setup, and 5-year maintenance support.',
    department: 'Department of National Defence',
    value: 1200000,
    currency: 'CAD',
    status: 'active',
    category: 'security',
    keywords: ['security', 'surveillance', 'cctv', 'access control', 'monitoring', 'installation'],
    location: 'Halifax, Nova Scotia',
    close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },

  // Janitorial Contracts
  {
    external_id: 'gov-jan-001',
    title: 'Comprehensive Janitorial Services for Office Complex',
    description: 'Daily cleaning and maintenance services for a 50,000 sq ft government office complex including floor care, washroom sanitation, waste removal, window cleaning, and emergency cleaning.',
    department: 'Department of National Defence',
    value: 420000,
    currency: 'CAD',
    status: 'active',
    category: 'janitorial',
    keywords: ['janitorial', 'cleaning', 'custodial', 'sanitation', 'waste', 'maintenance'],
    location: 'Toronto, Ontario',
    close_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-jan-002',
    title: 'Specialized Disinfection Services for Health Canada Facilities',
    description: 'Professional disinfection and sanitization services for health-related government facilities. Includes bio-hazard cleaning, air purification, and specialized surface treatments.',
    department: 'Health Canada',
    value: 350000,
    currency: 'CAD',
    status: 'active',
    category: 'janitorial',
    keywords: ['janitorial', 'disinfection', 'sanitation', 'cleaning', 'bio-hazard', 'maintenance'],
    location: 'Montreal, Quebec',
    close_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-jan-003',
    title: 'Carpet and Floor Maintenance Services',
    description: 'Professional carpet cleaning, floor waxing, and maintenance services for government office buildings across Western Canada. Includes specialized carpet stain removal and preventive care.',
    department: 'Public Works and Government Services Canada',
    value: 280000,
    currency: 'CAD',
    status: 'active',
    category: 'janitorial',
    keywords: ['janitorial', 'carpet', 'floor', 'cleaning', 'maintenance', 'waxing'],
    location: 'Calgary, Alberta',
    close_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },

  // Landscaping Contracts
  {
    external_id: 'gov-land-001',
    title: 'Year-Round Grounds Maintenance and Landscaping',
    description: 'Professional landscaping and grounds maintenance including lawn care, snow removal, tree maintenance, irrigation system management, and seasonal plantings for federal properties.',
    department: 'Parks Canada',
    value: 680000,
    currency: 'CAD',
    status: 'active',
    category: 'landscaping',
    keywords: ['landscaping', 'grounds', 'lawn', 'maintenance', 'snow', 'irrigation', 'tree'],
    location: 'Vancouver, British Columbia',
    close_date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-land-002',
    title: 'Snow Removal and Winter Maintenance Services',
    description: 'Comprehensive snow removal, ice management, and winter maintenance services for federal government buildings and parking facilities across Eastern Canada.',
    department: 'Public Services and Procurement Canada',
    value: 520000,
    currency: 'CAD',
    status: 'active',
    category: 'landscaping',
    keywords: ['landscaping', 'snow removal', 'winter', 'ice management', 'maintenance', 'parking'],
    location: 'Quebec City, Quebec',
    close_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-land-003',
    title: 'Tree Pruning and Forest Management Services',
    description: 'Professional tree pruning, disease management, and forest maintenance services for Canadian national parks and protected areas. Includes invasive species removal.',
    department: 'Department of Natural Resources',
    value: 450000,
    currency: 'CAD',
    status: 'active',
    category: 'landscaping',
    keywords: ['landscaping', 'tree', 'pruning', 'forest', 'maintenance', 'disease management'],
    location: 'Edmonton, Alberta',
    close_date: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },

  // Construction Contracts
  {
    external_id: 'gov-con-001',
    title: 'Office Building Renovation and Upgrades',
    description: 'Comprehensive renovation of a 5-story federal office building including electrical system upgrades, plumbing modernization, HVAC replacement, and interior design updates.',
    department: 'Public Services and Procurement Canada',
    value: 3500000,
    currency: 'CAD',
    status: 'active',
    category: 'construction',
    keywords: ['construction', 'renovation', 'electrical', 'plumbing', 'hvac', 'building', 'upgrades'],
    location: 'Winnipeg, Manitoba',
    close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-con-002',
    title: 'Parking Structure Construction',
    description: 'Design and construction of a new 500-space underground parking structure for federal government headquarters. Includes concrete work, electrical systems, and security features.',
    department: 'Department of National Defence',
    value: 8500000,
    currency: 'CAD',
    status: 'active',
    category: 'construction',
    keywords: ['construction', 'building', 'concrete', 'parking', 'electrical', 'structural'],
    location: 'Toronto, Ontario',
    close_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-con-003',
    title: 'Roofing Replacement for Government Complex',
    description: 'Complete roofing replacement for a large government complex including removal of old materials, new commercial-grade roofing, and weatherproofing systems.',
    department: 'Public Works and Government Services Canada',
    value: 1200000,
    currency: 'CAD',
    status: 'active',
    category: 'construction',
    keywords: ['construction', 'roofing', 'building', 'weatherproofing', 'replacement', 'materials'],
    location: 'Victoria, British Columbia',
    close_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },

  // IT Contracts
  {
    external_id: 'gov-it-001',
    title: 'Cybersecurity Assessment and Implementation',
    description: 'Comprehensive cybersecurity assessment, strategy development, and implementation for federal government IT infrastructure. Includes penetration testing and security hardening.',
    department: 'Communications Security Establishment',
    value: 1500000,
    currency: 'CAD',
    status: 'active',
    category: 'it',
    keywords: ['it', 'cybersecurity', 'network', 'security', 'assessment', 'technology'],
    location: 'Ottawa, Ontario',
    close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-it-002',
    title: 'Cloud Migration and Infrastructure Services',
    description: 'Cloud infrastructure assessment, migration planning, and implementation of government applications to cloud platforms. Includes training and support.',
    department: 'Innovation, Science and Economic Development Canada',
    value: 2000000,
    currency: 'CAD',
    status: 'active',
    category: 'it',
    keywords: ['it', 'cloud', 'infrastructure', 'technology', 'migration', 'development'],
    location: 'Montreal, Quebec',
    close_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-it-003',
    title: 'Software Development for Citizens Portal',
    description: 'Full-stack software development for new citizen-facing government services portal. Includes frontend, backend, database design, and 2-year maintenance and support.',
    department: 'Service Canada',
    value: 3200000,
    currency: 'CAD',
    status: 'active',
    category: 'it',
    keywords: ['it', 'software', 'development', 'technology', 'portal', 'database'],
    location: 'Gatineau, Quebec',
    close_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-it-004',
    title: 'IT Support and Help Desk Services',
    description: '24/7 IT support services for government employees including help desk operations, hardware support, software troubleshooting, and IT ticket management.',
    department: 'Public Services and Procurement Canada',
    value: 850000,
    currency: 'CAD',
    status: 'active',
    category: 'it',
    keywords: ['it', 'support', 'network', 'technology', 'help desk', 'hardware'],
    location: 'Vancouver, British Columbia',
    close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },

  // Consulting Contracts
  {
    external_id: 'gov-con-consult-001',
    title: 'Strategic Business Consulting and Change Management',
    description: 'Business strategy consulting for major government department restructuring including organizational design, process improvement, and change management support.',
    department: 'Department of Human Resources',
    value: 750000,
    currency: 'CAD',
    status: 'active',
    category: 'consulting',
    keywords: ['consulting', 'strategy', 'management', 'organizational', 'advisory', 'change'],
    location: 'Ottawa, Ontario',
    close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-con-consult-002',
    title: 'Policy Analysis and Research Services',
    description: 'Research and analysis services for government policy development including literature reviews, stakeholder consultations, and policy recommendations.',
    department: 'Department of Finance',
    value: 600000,
    currency: 'CAD',
    status: 'active',
    category: 'consulting',
    keywords: ['consulting', 'research', 'analysis', 'policy', 'advisory', 'strategy'],
    location: 'Toronto, Ontario',
    close_date: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  },
  {
    external_id: 'gov-con-consult-003',
    title: 'Training and Capacity Building Program',
    description: 'Development and delivery of comprehensive training program for government employees covering leadership, technical skills, and professional development.',
    department: 'Public Service Commission',
    value: 500000,
    currency: 'CAD',
    status: 'active',
    category: 'consulting',
    keywords: ['consulting', 'training', 'development', 'capacity building', 'advisory', 'management'],
    location: 'Calgary, Alberta',
    close_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    publish_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    source: 'buyandsell.gc.ca',
    source_url: 'https://buyandsell.gc.ca/'
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Initialize tables
    console.log('📋 Initializing database tables...');
    await initializeDatabase();
    console.log('✅ Tables initialized\n');

    // Connect to database
    const client = await pool.connect();

    try {
      // Clear existing contracts
      console.log('🗑️  Clearing existing contract data...');
      await client.query('DELETE FROM contracts WHERE source = $1', ['buyandsell.gc.ca']);
      console.log('✅ Existing data cleared\n');

      // Insert contracts
      console.log('📥 Inserting new contract data...');
      let insertedCount = 0;

      await client.query('BEGIN');

      for (const contract of contracts) {
        try {
          await client.query(`
            INSERT INTO contracts (
              external_id, title, description, department, value, currency,
              status, category, keywords, location, close_date, publish_date,
              source, source_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (external_id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              updated_at = NOW()
          `, [
            contract.external_id,
            contract.title,
            contract.description,
            contract.department,
            contract.value,
            contract.currency,
            contract.status,
            contract.category,
            contract.keywords,
            contract.location,
            contract.close_date,
            contract.publish_date,
            contract.source,
            contract.source_url
          ]);

          insertedCount++;
        } catch (err) {
          console.error(`Error inserting contract ${contract.external_id}:`, err.message);
        }
      }

      await client.query('COMMIT');

      // Get statistics
      const categoryStats = await client.query(`
        SELECT category, COUNT(*) as count, AVG(value) as avg_value
        FROM contracts
        WHERE status = 'active'
        GROUP BY category
        ORDER BY count DESC
      `);

      const totalStats = await client.query(`
        SELECT COUNT(*) as total_contracts, SUM(value) as total_value
        FROM contracts
        WHERE status = 'active'
      `);

      console.log(`✅ Inserted ${insertedCount} contracts\n`);

      console.log('📊 Contract Statistics:');
      console.log(`   Total Active Contracts: ${totalStats.rows[0].total_contracts}`);
      console.log(`   Total Contract Value: $${(totalStats.rows[0].total_value / 1000000).toFixed(2)}M\n`);

      console.log('   By Category:');
      for (const row of categoryStats.rows) {
        console.log(`   • ${row.category.toUpperCase()}: ${row.count} contracts (avg: $${(row.avg_value / 1000).toFixed(0)}K)`);
      }

      console.log('\n✅ Database seeding completed successfully!');
      process.exit(0);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
