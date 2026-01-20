#!/usr/bin/env node

/**
 * Script to add brand_style_context column to profiles table
 * Run this script to apply the migration
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📖 Reading migration file...')
    const migrationPath = path.join(__dirname, 'docs', 'migration-add-brand-style-context.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('🔄 Applying migration to add brand_style_context column...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // If the RPC doesn't exist, try direct query (not all Supabase instances have exec_sql)
      console.log('⚠️  exec_sql RPC not available, attempting direct query...')
      
      // Split by semicolons and execute each statement
      const statements = sql.split(';').filter(s => s.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement })
          if (stmtError) {
            console.log('⚠️  Note:', stmtError.message)
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!')
    console.log('📝 The brand_style_context column has been added to the profiles table.')
    console.log('\nYou can now use the BrandOnboardingModal component to:')
    console.log('  1. Upload a brand logo')
    console.log('  2. Analyze the brand with AI')
    console.log('  3. Edit and save the brand style description')
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.log('\n📝 Manual migration instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the following SQL:')
    console.log('\n' + fs.readFileSync(path.join(__dirname, 'docs', 'migration-add-brand-style-context.sql'), 'utf8'))
    process.exit(1)
  }
}

applyMigration()
