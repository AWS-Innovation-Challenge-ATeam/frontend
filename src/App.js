import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import {
  RekognitionClient,
  RecognizeCelebritiesCommand,
} from "@aws-sdk/client-rekognition";
import { Configuration, OpenAIApi } from "openai";

const accessKeyId = "";
const secretAccessKey = "";
const region = "us-west-1";

const openaiConfiguration = new Configuration({
  apiKey: "sk-",
});

const openai = new OpenAIApi(openaiConfiguration);

const rekognitionClient = new RekognitionClient({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region,
});
let jack = "lastCelebrity";

// Create the cache object
let celebrityCache = {};

function App() {
  const [loading, setLoading] = useState(false);
  const [celebrityInfo, setCelebrityInfo] = useState(null);
  const [generatedInfo, setGeneratedInfo] = useState(null);
  const [lastCelebrity, setLastCelebrity] = useState(null);
  const [celebrityTimeout, setCelebrityTimeout] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => {
    startWebcam();
    continuousCapture();
    if (celebrityInfo) {
      handleGetInfo(celebrityInfo);
    }
  }, [celebrityInfo]);

  const startWebcam = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = videoStream;
    } catch (err) {
      console.error("Error starting the webcam:", err);
    }
  };

  const captureSnapshot = () => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.className = "hidden";
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      canvas.toBlob((blob) => {
        resolve(blob);
      });
    });
  };

  const continuousCapture = async () => {
    capturingRef.current = true;
    while (capturingRef.current) {
      const blob = await captureSnapshot();
      console.log("calling recognizeCelebrities")
      await recognizeCelebrities(blob);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const recognizeCelebrities = async (blob) => {
    if (!blob) return;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const params = {
      Image: {
        Bytes: buffer,
      },
    };

    try {
      const command = new RecognizeCelebritiesCommand(params);
      const data = await rekognitionClient.send(command);
      const celebrity = data.CelebrityFaces[0];
      if (celebrity && celebrity.MatchConfidence > 95) {
        if (celebrity.Name !== jack) {
          setLastCelebrity(celebrity.Name);
          jack = celebrity.Name;
          const currentCelebrityInfo = JSON.stringify(data, null, 2);
          setCelebrityInfo(currentCelebrityInfo);
          setGeneratedInfo(null);
          console.log("New celebrity, calling handleGetInfo immediately");
        } else {
          console.log("Celebrity detected, but it's the same as the last one");
        }
        return true;
      } else {
        // console.log("no celebrity detected");
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const fetchGeneratedText = async (prompt) => {
    setLoading(true);
    try {
      const result = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.1,
        max_tokens: 400,
      });
      const myString = result.data.choices[0].text.substring(2);
      setGeneratedInfo(myString);
      // Store the information in the cache
      celebrityCache[jack] = myString;
    } catch (e) {
      console.error(e);
      setGeneratedInfo("Something went wrong, please try again.");
    }
    setLoading(false);
  };

  const handleGetInfo = (currentCelebrityInfo) => {
    if (!currentCelebrityInfo) return;

    const celebrity = JSON.parse(currentCelebrityInfo);
    const athleteName = celebrity.CelebrityFaces[0]?.Name;

    if (athleteName) {
      const prompt = `Can you give me a short, 150 word summary about ${athleteName} in a JSON format, including the following fields: "Name", "Summary", "Interesting". The "Interesting fact" field can be any interesting fact about ${athleteName}, but if it's obscure that would be even better. Make it relatable and heartwarming if possible. interesting facts should be longer. I know a decent bit about basketball, so tell me something that would amuse me.`;
      console.log("sending prompt to fetchGeneratedText");
      // Check if the information is already in the cache
      if (celebrityCache[athleteName]) {
        setGeneratedInfo(celebrityCache[athleteName]);
        console.log("Information retrieved from cache");
      } else {
        fetchGeneratedText(prompt);
        console.log(prompt);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-200 to-white p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Athlete Recognition and Information
        </h1>
        <div className="flex flex-row items-start justify-between">
          <div className="w-1/2">
            <video
              id="webcam"
              ref={videoRef}
              className="rounded"
              autoPlay
              muted></video>
            <canvas id="canvas" ref={canvasRef} className="hidden"></canvas>
          </div>
          <div className="quiz-container w-1/2 h-64 rounded-lg overflow-auto shadow-lg">
            {lastCelebrity && (
              <h2 className="quiz-header text-2xl font-bold mb-4">
                {" "}
                Name: {lastCelebrity}
              </h2>
            )}
            {generatedInfo && (
              <ul className="list-none p-4">
                <li className="mb-4">
                  <h3 className="font-bold mb-2">Summary</h3>
                  <p className="font-normal text-gray-700">
                    {JSON.parse(generatedInfo).Summary}
                  </p>
                </li>
                <li className="mb-4">
                  <h3 className="font-bold mb-2">Interesting Fact</h3>
                  <p className="font-normal text-gray-700">
                    {JSON.parse(generatedInfo).Interesting}
                  </p>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
