# AttariAI

AttariAI ایک سادہ اردو AI starter ہے جو سوال کا جواب تلاش کرتے وقت web search کو صرف `shamela.ws` تک محدود رکھتا ہے۔

## چلانے کا طریقہ

1. Node.js 18 یا اس سے نیا ورژن استعمال کریں۔
2. Hosting یا اپنے computer میں environment variable `OPENAI_API_KEY` set کریں۔
3. پھر `npm start` چلائیں۔
4. Browser میں `http://localhost:3000` کھولیں۔

اختیاری طور پر `OPENAI_MODEL` set کیا جا سکتا ہے۔ Default `gpt-5` ہے۔

## اہم بات

API key کو GitHub repository میں مت لکھیں۔ اسے hosting کی Secret/Environment Variables setting میں رکھیں۔

یہ ابتدائی version Shamela کی پوری database download نہیں کرتا؛ live search کے ذریعے `shamela.ws` سے مواد تلاش کرتا ہے۔ بعد میں official Shamela API ملنے پر اسے مزید مضبوط بنایا جا سکتا ہے۔
