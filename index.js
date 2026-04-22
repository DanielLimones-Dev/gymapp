import 'react-native-gesture-handler'

// Polyfill crypto.subtle (SHA-256) para Supabase PKCE
import * as ExpoCrypto from 'expo-crypto'

const _subtle = {
  digest: async (algorithm, data) => {
    const uint8 = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer)
    let str = ''
    for (let i = 0; i < uint8.length; i++) str += String.fromCharCode(uint8[i])
    const hex = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      str,
      { encoding: ExpoCrypto.CryptoEncoding.HEX }
    )
    const out = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    return out.buffer
  }
}

if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues: (arr) => { arr.set(ExpoCrypto.getRandomBytes(arr.length)); return arr },
    subtle: _subtle,
  }
} else {
  if (!globalThis.crypto.subtle) globalThis.crypto.subtle = _subtle
  if (!globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues = (arr) => { arr.set(ExpoCrypto.getRandomBytes(arr.length)); return arr }
  }
}

import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
