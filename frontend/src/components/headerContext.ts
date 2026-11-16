import { createContext } from 'react'

/**
 * Lets a page hide the header's labels (Layout), e.g. while the country
 * search takes their place on a phone.
 */
export const HeaderContext = createContext<(hidden: boolean) => void>(() => {})
