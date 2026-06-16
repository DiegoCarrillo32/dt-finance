'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, CategoryType } from '@/lib/types'

export async function getCategories(type?: CategoryType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (type) query = query.eq('type', type)

  const { data } = await query
  return data ?? []
}

export async function createCategory(
  name: string,
  type: CategoryType,
  color: string,
  icon: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('categories')
    .insert({ name, type, color, icon, user_id: user.id })

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  icon: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('categories')
    .update({ name, color, icon })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
