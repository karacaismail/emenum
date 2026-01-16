#!/usr/bin/env node
/**
 * Script to create super admin user in Supabase
 * 
 * Usage:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-super-admin.mjs
 * 
 * Or set environment variables in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=your_url
 *   SUPABASE_SERVICE_ROLE_KEY=your_key
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = 'boraydeger@hotmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdmin123!'

if (!SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required')
  process.exit(1)
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSuperAdmin() {
  try {
    console.log('🔍 Checking if user already exists...')
    
    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message)
      process.exit(1)
    }

    const existingUser = existingUsers.users.find(u => u.email === ADMIN_EMAIL)

    if (existingUser) {
      console.log('✅ User already exists. Updating app_metadata...')
      
      // Update existing user
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          app_metadata: {
            ...existingUser.app_metadata,
            is_super_admin: true
          }
        }
      )

      if (error) {
        console.error('❌ Error updating user:', error.message)
        process.exit(1)
      }

      console.log('✅ Super admin status updated successfully!')
      console.log(`   User ID: ${data.user.id}`)
      console.log(`   Email: ${data.user.email}`)
      console.log(`   App Metadata:`, data.user.app_metadata)
    } else {
      console.log('📝 Creating new super admin user...')
      
      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        app_metadata: {
          is_super_admin: true
        },
        user_metadata: {
          full_name: 'Super Admin'
        }
      })

      if (error) {
        console.error('❌ Error creating user:', error.message)
        process.exit(1)
      }

      console.log('✅ Super admin user created successfully!')
      console.log(`   User ID: ${data.user.id}`)
      console.log(`   Email: ${data.user.email}`)
      console.log(`   Password: ${ADMIN_PASSWORD}`)
      console.log(`   App Metadata:`, data.user.app_metadata)
      console.log('')
      console.log('⚠️  IMPORTANT: Please change the password after first login!')
    }

    console.log('')
    console.log('🎉 Setup complete! You can now login with:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    if (!existingUser) {
      console.log(`   Password: ${ADMIN_PASSWORD}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

createSuperAdmin()

