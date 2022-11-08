import { parse } from 'node-html-parser'
import { $fetch } from 'ohmyfetch'
import { FALLBACK_AVATAR } from '../../fallback'
import type { Sponsorship } from '../../types'

export interface GetPastSponsorsOptions {
  /**
   * @default false
   * */
  includePrivate?: boolean
}

function pickSponsorsInfo(html: string, filter?: (user: Sponsorship) => boolean): Sponsorship[] {
  const root = parse(html)
  const baseDate = new Date()
  let sponsors = root.querySelectorAll('div').map((el, index) => {
    const isPublic = el.querySelector('img')
    const createdAt = new Date(baseDate.getTime() - index * 1000 * 60 * 60 * 24 * 30).toUTCString()
    const name = isPublic ? isPublic?.getAttribute('alt')?.replace('@', '') : 'Private Sponsor'
    const avatarUrl = isPublic ? isPublic?.getAttribute('src') : FALLBACK_AVATAR

    return {
      sponsor: {
        __typename: undefined,
        login: undefined,
        name,
        avatarUrl,
        type: 'User',
      },
      isOneTime: undefined,
      monthlyDollars: -1,
      privacyLevel: isPublic ? 'PUBLIC' : 'PRIVATE',
      tierName: undefined,
      createdAt,
    } as unknown as Sponsorship
  })

  if (filter)
    sponsors = sponsors.filter(filter)

  return sponsors
}

export async function getPastSponsors(username: string, options: GetPastSponsorsOptions = {}): Promise<Sponsorship[]> {
  const { includePrivate } = options
  const allSponsors: Sponsorship[] = []
  let newSponsors = []
  let cursor = 1

  do {
    const content = await $fetch(`https://github.com/sponsors/${username}/sponsors_partial?filter=inactive&page=${cursor++}`, { method: 'GET' })
    newSponsors = pickSponsorsInfo(content, (user) => {
      const isPrivate = user.privacyLevel === 'PRIVATE'

      if (isPrivate)
        return !!includePrivate

      return true
    })
    allSponsors.push(...newSponsors)
  } while (newSponsors.length)

  return allSponsors
}
