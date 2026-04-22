import { makeMutable } from 'react-native-reanimated'

// Shared value accesible desde worklets (UI thread)
export const modalCountSV = makeMutable(0)

export const openModal  = () => { modalCountSV.value++ }
export const closeModal = () => { if (modalCountSV.value > 0) modalCountSV.value-- }
export const isModalOpen = () => modalCountSV.value > 0
export const getCount   = () => modalCountSV.value
