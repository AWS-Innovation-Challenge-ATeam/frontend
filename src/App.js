import React, { useState } from 'react';
import './App.css';
import { RekognitionClient, RecognizeCelebritiesCommand } from '@aws-sdk/client-rekognition';
import { Configuration, OpenAIApi } from 'openai';

// Replace with your actual AWS credentials
const accessKeyId = '';
const secretAccessKey = "";
const region = 'us-west-1';

const openaiConfiguration = new Configuration({
  apiKey: '',
});

const openai = new OpenAIApi(openaiConfiguration);

// Configure AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region,
});

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [celebrityInfo, setCelebrityInfo] = useState(null);
  const [generatedInfo, setGeneratedInfo] = useState(null);
  const [imageURL, setImageURL] = useState(null); // Add this new state variable

  const handleImageUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const recognizeCelebrities = async () => {
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Add this line to set the image URL
    setImageURL(URL.createObjectURL(file));

    const params = {
      Image: {
        Bytes: buffer,
      },
    };

    try {
      console.log("recoginizing celebrities")
      const command = new RecognizeCelebritiesCommand(params);
      const data = await rekognitionClient.send(command);
      setCelebrityInfo(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGeneratedText = async (prompt) => {
    setLoading(true);
    try {
      const result = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: prompt,
        temperature: 0.5,
        max_tokens: 4000,
      });
      const myString = result.data.choices[0].text.substring(2);
      setGeneratedInfo(myString);
    } catch (e) {
      console.error(e);
      setGeneratedInfo('Something went wrong, please try again.');
    }
    setLoading(false);
  };
  
  

  const handleGetInfo = () => {
    if (!celebrityInfo) return;

    const celebrity = JSON.parse(celebrityInfo);
    const athleteName = celebrity.CelebrityFaces[0]?.Name;

    if (athleteName) {
      const prompt = `Provide an overview of the fan culture and history surrounding the team/players, including personal anecdotes and lesser-known facts that may intrigue those with prior knowledge of the subject ${athleteName}.`;
      console.log("this is the prompt " + prompt);
      fetchGeneratedText(prompt);
    }
  };

  return (
    <div className="App min-h-screen bg-gray-100">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Athelte Recognition and Information</h1>
        <div className="flex flex-col items-center">
          <input
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="mb-4 p-2 bg-white border border-gray-300 rounded"
          />
          <button
            onClick={recognizeCelebrities}
            className="mb-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Recognize Celebrities
          </button>
          <button
            onClick={handleGetInfo}
            disabled={loading}
            className={`mb-4 ${
              loading ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'
            } text-white font-semibold py-2 px-4 rounded`}
          >
            {loading ? 'Generating...' : 'Get Information'}
          </button>
        </div>
      <div className="container mx-auto mb-4">
        {imageURL && <img src={imageURL} alt="Recognized Celebrity" className="rounded" />}
      </div>
        <div className='container'>
        {generatedInfo && (
          <p className="mb-3 text-lg text-gray-500 md:text-xl dark:text-gray-400">
            {generatedInfo.replace(/\n/g, ' ')}
            {JSON.stringify(generatedInfo, null, 2)}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;
