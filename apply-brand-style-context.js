/**
 * Migration Script: Add brand_style_context column to profiles table
 * 
 * This script applies the brand_style_context migration to your Supabase database.
 * Run this with: node apply-brand-style-context.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function applyMigration() {
  console.log('🚀 Starting brand_style_context migration...\n')

  try {
    // Add brand_style_context column
    console.log('📝 Adding brand_style_context column to profiles table...')
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS brand_style_context TEXT;
      `
    })

    if (alterError) {
      // If exec_sql RPC doesn't exist, we'll need to run this via SQL editor
      console.log('⚠️  Cannot run migration directly via API.')
      console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:\n')
      console.log('--------------------------------------------------')
      console.log('ALTER TABLE profiles')
      console.log('ADD COLUMN IF NOT EXISTS brand_style_context TEXT;')
      console.log('--------------------------------------------------\n')
      console.log('💡 You can find the SQL Editor at:')
      console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}\n`)
      
      // Try to verify if column already exists
      console.log('🔍 Checking if column already exists...')
      const { data, error } = await supabase
        .from('profiles')
        .select('brand_style_context')
        .limit(1)

      if (!error) {
        console.log('✅ Column brand_style_context already exists!')
        console.log('   Migration may have been applied previously.\n')
        return
      }

      console.log('❌ Column does not exist yet. Please run the SQL manually.\n')
      return
    }

    console.log('✅ Column added successfully!\n')

    // Verify the column was added
    console.log('🔍 Verifying migration...')
    const { data, error: verifyError } = await supabase
      .from('profiles')
      .select('brand_style_context')
      .limit(1)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      return
    }

    console.log('✅ Migration verified successfully!\n')
    console.log('🎉 brand_style_context column is now available in the profiles table.')
    console.log('   The BrandOnboarding component will now save AI-generated brand descriptions.')

  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

// Run the migration
applyMigration()
