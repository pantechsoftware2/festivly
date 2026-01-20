/**
 * Verify Profiles Table Schema
 * 
 * This script checks if the profiles table has the required columns
 * for persisting user preferences (industry_type and brand_logo_url)
 * 
 * Run: node verify-profiles-schema.js
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('Please ensure .env.local has:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifySchema() {
  console.log('\n🔍 Verifying Profiles Table Schema...\n')

  try {
    // Query the information_schema to get column details
    const { data: columns, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, column_default, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'profiles'
          ORDER BY ordinal_position;
        `
      })

    if (error) {
      // If RPC doesn't exist, try direct query
      console.log('ℹ️  Trying direct table query...\n')
      
      const { data: profile, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError
      }

      // Check if we can query the table
      const { data: testQuery, error: testError } = await supabase
        .from('profiles')
        .select('id, email, industry_type, brand_logo_url, created_at, updated_at')
        .limit(1)

      if (testError) {
        throw testError
      }

      console.log('✅ Profiles table exists and is accessible')
      
      // Get sample data to infer schema
      if (testQuery && testQuery.length > 0) {
        const sampleProfile = testQuery[0]
        console.log('\n📊 Sample Profile Data:')
        console.log(JSON.stringify(sampleProfile, null, 2))
        
        console.log('\n✅ Required Columns Found:')
        console.log('  - id:', sampleProfile.hasOwnProperty('id') ? '✅' : '❌')
        console.log('  - email:', sampleProfile.hasOwnProperty('email') ? '✅' : '❌')
        console.log('  - industry_type:', sampleProfile.hasOwnProperty('industry_type') ? '✅' : '❌')
        console.log('  - brand_logo_url:', sampleProfile.hasOwnProperty('brand_logo_url') ? '✅' : '❌')
      } else {
        console.log('\nℹ️  No profiles in database yet. Testing column access...')
        
        // Test if columns exist by trying to select them
        const requiredColumns = ['id', 'email', 'industry_type', 'brand_logo_url']
        const results = {}
        
        for (const col of requiredColumns) {
          const { error: colError } = await supabase
            .from('profiles')
            .select(col)
            .limit(0)
          
          results[col] = !colError
        }
        
        console.log('\n✅ Column Verification:')
        Object.entries(results).forEach(([col, exists]) => {
          console.log(`  - ${col}: ${exists ? '✅' : '❌'}`)
        })
      }
      
      return
    }

    // If we got column info from information_schema
    if (columns && Array.isArray(columns)) {
      console.log('📋 Table Columns:')
      console.log(columns)
      
      const requiredColumns = ['industry_type', 'brand_logo_url']
      const foundColumns = columns.map(col => col.column_name)
      
      console.log('\n✅ Required Columns Check:')
      requiredColumns.forEach(col => {
        const exists = foundColumns.includes(col)
        console.log(`  - ${col}: ${exists ? '✅ Found' : '❌ Missing'}`)
      })
    }

    // Count profiles
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (!countError) {
      console.log(`\n📊 Total Profiles: ${count || 0}`)
    }

    // Check for profiles with preferences set
    const { data: profilesWithPrefs, error: prefsError } = await supabase
      .from('profiles')
      .select('id, email, industry_type, brand_logo_url')
      .not('industry_type', 'is', null)

    if (!prefsError && profilesWithPrefs) {
      console.log(`\n👤 Profiles with Industry Set: ${profilesWithPrefs.length}`)
    }

    const { data: profilesWithLogos, error: logosError } = await supabase
      .from('profiles')
      .select('id, email, industry_type, brand_logo_url')
      .not('brand_logo_url', 'is', null)

    if (!logosError && profilesWithLogos) {
      console.log(`🖼️  Profiles with Logo Set: ${profilesWithLogos.length}`)
    }

    console.log('\n✅ Schema verification complete!\n')

  } catch (error) {
    console.error('❌ Error verifying schema:', error.message)
    console.log('\n💡 This might mean:')
    console.log('  1. The profiles table doesn\'t exist yet')
    console.log('  2. You need to run the migration: docs/MIGRATION-USER-PREFERENCES.sql')
    console.log('  3. RLS policies might be restricting access')
    console.log('\n📚 See: docs/APPLY-USER-PREFERENCES-MIGRATION.md')
    process.exit(1)
  }
}

verifySchema()
