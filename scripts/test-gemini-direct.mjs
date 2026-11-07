/**
 * Test Gemini API directly (not through Supabase function)
 * To verify API key is working
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE'
const GEMINI_MODEL = 'gemini-3.5-flash'

console.log('🧪 Testing Gemini API Directly\n')
console.log('Model:', GEMINI_MODEL)
console.log('API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET')
console.log()

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ GEMINI_API_KEY not set')
  console.error('   Please add it to your .env file or pass it as environment variable')
  console.error('   Get your key from: https://aistudio.google.com/app/apikey')
  process.exit(1)
}

const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const requestBody = {
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: 'Halo, bagaimana kabarmu? Jawab singkat saja.',
        },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 100,
  },
}

console.log('📤 Sending request to Gemini API...\n')

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  console.log('📥 Response status:', response.status, response.statusText)
  console.log()

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Gemini API error:')
    console.error(errorText)
    
    console.log('\n💡 Troubleshooting:')
    console.log('   - Check if API key is valid')
    console.log('   - Check if API is enabled in Google Cloud Console')
    console.log('   - Check quota limits')
    process.exit(1)
  }

  const data = await response.json()
  
  console.log('📄 Full response:', JSON.stringify(data, null, 2))
  console.log()
  
  if (data.candidates && data.candidates[0]) {
    const text = data.candidates[0].content.parts[0].text
    console.log('✅ Success! Gemini API is working!\n')
    console.log('Response:', text)
    console.log('\n🎉 Your Gemini API key is valid and working correctly!')
  } else {
    console.log('⚠️  Unexpected response structure')
    console.log('   Candidates:', data.candidates)
    console.log('   Prompt feedback:', data.promptFeedback)
  }
} catch (error) {
  console.error('❌ Error calling Gemini API:', error.message)
  console.log('\n💡 Make sure you have internet connection and Gemini API is accessible')
  process.exit(1)
}
