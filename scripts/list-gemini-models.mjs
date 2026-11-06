/**
 * List available Gemini models
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE'

console.log('🔍 Listing Available Gemini Models\n')
console.log('API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET')
console.log()

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ GEMINI_API_KEY not set')
  process.exit(1)
}

const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`

console.log('📤 Fetching models list...\n')

try {
  const response = await fetch(url)
  
  console.log('📥 Response status:', response.status, response.statusText)
  console.log()

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error:')
    console.error(errorText)
    console.log()
    console.log('💡 This usually means:')
    console.log('   - API key is invalid or revoked')
    console.log('   - Generative AI API is not enabled')
    console.log('   - Key doesn\'t have proper permissions')
    console.log()
    console.log('🔧 To fix:')
    console.log('   1. Go to https://aistudio.google.com/app/apikey')
    console.log('   2. Make sure you have a valid API key')
    console.log('   3. Try creating a new API key')
    console.log('   4. Ensure "Generative Language API" is enabled')
    process.exit(1)
  }

  const data = await response.json()
  
  if (data.models && data.models.length > 0) {
    console.log('✅ Available models:\n')
    data.models.forEach((model) => {
      console.log(`   - ${model.name}`)
      if (model.supportedGenerationMethods) {
        console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`)
      }
    })
    console.log()
    console.log('💡 Use any of these model names in your code')
  } else {
    console.log('⚠️  No models found')
    console.log('   Your API key might not have access to any models')
  }
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
