#!/bin/bash
echo "🧪 Running All Tests..."
echo

echo "1️⃣ Test Anon Access (should all fail)"
node --env-file=.env scripts/test-anon.mjs
echo

echo "2️⃣ Test Chat Function"
node --env-file=.env scripts/test-chat.mjs
echo

echo "3️⃣ Test Safety Filter"
node --env-file=.env scripts/test-safety.mjs
echo

echo "4️⃣ Test Gemini Direct"
node --env-file=.env scripts/test-gemini-direct.mjs
echo

echo "✅ All Tests Complete!"
