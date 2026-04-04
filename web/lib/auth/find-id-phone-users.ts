import type { SupabaseClient } from '@supabase/supabase-js'

export const FIND_ID_NO_PHONE_ACCOUNT_MESSAGE = '해당 번호로 가입된 계정이 없습니다.'

export type FindIdEligibleUser = {
  id: string
  username: string
  created_at: string
}

/**
 * 아이디 찾기: 일반(휴대폰·아이디) 가입만 대상.
 * 이 프로젝트에서는 해당 경우에만 public.users.username 이 설정되므로,
 * phone + username 존재 여부만으로 구분한다. (카카오·네이버 가입은 username 없음)
 */
export async function listUsersEligibleForFindId(
  supabaseAdmin: SupabaseClient,
  phoneNumber: string
): Promise<FindIdEligibleUser[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('users')
    .select('id, username, created_at')
    .eq('phone', phoneNumber)
    .not('username', 'is', null)

  if (error || !rows?.length) {
    return []
  }

  return rows
    .filter((row) => row.id && typeof row.username === 'string' && row.username.trim() !== '')
    .map((row) => ({
      id: row.id,
      username: row.username!.trim(),
      created_at: row.created_at,
    }))
}
