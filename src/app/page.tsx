// src/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

// Declare a global interface to add the webkitSpeechRecognition property to the Window object
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { faClose, faArrowDown, faLock, faMicrophone, faRecordVinyl, faUsers, faWandSparkles, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Notification from '../lib/notify';
import { SignedIn, UserButton } from '@clerk/nextjs';
import CleanMode from './modes/cleanMode/CleanMode';
import PrivateMode from './modes/privateMode/PrivateMode';
import CollaborativeMode from './modes/collaborativeMode/CollaborativeMode';
import { UserInfo, FileData } from '../lib/types';
import loader from './components/loader';
import { addFile, getFileByPk } from '../lib/files';
import { saveAndPlayAudio, openVoiceDatabase } from '../app/api/text-to-speech/utils/indexdb.js';
import VoiceMode from "./views/VoiceMode";
import { saveAnnotationDb, getAnnotationsDb, deleteAnnotationDb } from './modes/collaborativeMode/utils/indexDb';

import { app } from './firebaseConfig';
const db = getFirestore(app);

export default function Home() {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'success' | 'info';
  } | null>(null);
  const [isClearMode, setIsClearMode] = useState(true);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);
  const [newURL, setNewURL] = useState<string>(''); // State for new input URL
  const [paperURL, setPaperURL] = useState<string>('https://arxiv.org/pdf/2403.08715'); // Paper URL state 1) https://arxiv.org/pdf/2401.05268 2) https://arxiv.org/pdf/2406.14283
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingUser, setIsLoadingUser] = React.useState(false);
  const [refetchUserInfo, setRefetchUserInfo] = React.useState(false);
  const [paperId, setPaperId] = React.useState<string>('');
  const [loadingTextToSpeech, setLoadingTextToSpeech] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState<string>('');
  const [voiceRecording, setVoiceRecording] = React.useState(false);
  const [voiceRecordingText, setVoiceRecordingText] = React.useState('');
  // const recognitionRef = useRef<Window['SpeechRecognition'] | null>(null);
  const [voiceRecordingTextToSpeechBlob, setVoiceRecordingTextToSpeechBlob] = React.useState<Blob>();
  const [voiceRecordingTextToSpeechUrl, setVoiceRecordingTextToSpeechUrl] = React.useState<string>();
  const [voiceRecordingTextToSpeechPlaying, setVoiceRecordingTextToSpeechPlaying] = React.useState(false);
  const [showOverlaySpeechTranscript, setShowOverlaySpeechTranscript] = React.useState(false);
  // State variables for speech recognition
  const [isListening, setIsListening] = useState(false);
  // const [transcript, setTranscript] = useState('');
  // const recognitionRef = useRef<SpeechRecognition | null>(null);
  const expandRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
        if (expandRef.current && !expandRef.current.contains(event.target)) {
          setRecordingComplete(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  
  // ----------------------------

  // State variables for speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Reference to store the SpeechRecognition instance
  const recognitionRef = useRef<any>(null);
  // Start Recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingComplete(false);
    setTranscript('');

    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const { transcript } = event.results[event.results.length - 1][0];
      console.log('Speech recognition result:', event.results);
      setTranscript(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      alert('Speech recognition error: ' + event.error);
      setIsRecording(false);
    };

    // recognitionRef.current.onend = () => {
    //   setIsRecording(false);
    //   setRecordingComplete(true);
    //   console.log('Recording complete');
    //   console.log('Transcript:', transcript);

    //   if (transcript.length > 0) {
    //     handleAIResponse(transcript);
    //   } else {
    //     alert('No speech detected. Please try again.');
    //   }
    // };

    recognitionRef.current.start();
  };

  // useEffect(() => {
  //   // check whether transcript has word "done". If yes then stop recording
  //   if (transcript.toLowerCase().includes('stop')) {
  //     setIsRecording(false);
  //     setRecordingComplete(true);
  //     console.log('Recording complete');
  //     console.log('Transcript:', transcript);

  //     if (transcript.length > 0) {
  //       // send without "done" word
  //       handleAIResponse(transcript.replace('stop', ''));
  //     } else {
  //       alert('No speech detected. Please try again.');
  //     }
  //   }
  // }, [transcript]);

  // Stop Recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      handleAIResponse(transcript);
    }
  };

  // Toggle Recording
  const handleToggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // ----------------------------

  // Add a loading indicator when the assistant is processing
  const [isProcessing, setIsProcessing] = useState(false);

  const { isLoaded, isSignedIn, user } = useUser();

  const checkAndSetUser = async () => {
    setIsLoadingUser(true);
    console.log('Checking user in Firestore...');
    if (!user) return;
    console.log('User id:', user.id);
    try {
      const userRef = doc(db, 'users', user.id);

      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('User exists in Firestore, getting data...');
        // User exists, get data
        const userData: UserInfo = docSnap.data() as UserInfo;
        setUserInfo(userData);
      } else {
        console.log('User does not exist in Firestore, creating...');
        // User does not exist, create with default generated ID
        const newUser: UserInfo = {
          id: user.id,
          name: user.firstName || '' + user.lastName || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.emailAddresses[0]?.emailAddress || '',
        };

        await setDoc(userRef, newUser);
        setUserInfo(newUser);
      }
    } catch (error) {
      console.error('Error checking or creating user in Firestore:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Show notification
  const triggerNotification = (
    nMessage: string,
    nType: 'error' | 'success' | 'info'
  ) => {
    setNotification({ message: nMessage, type: nType });
  };

  // Modes
  const handleOpenClearMode = () => {
    setIsLoading(true);
    setIsClearMode(true);
    setIsPrivateMode(false);
    setIsCollaborativeMode(false);
    setIsLoading(false);
  };

  const handleOpenPrivateMode = async () => {
    setIsLoading(true);
    await checkAndSetUser();
    setIsClearMode(false);
    setIsPrivateMode(true);
    setIsCollaborativeMode(false);
    setIsLoading(false);
  };

  const handleOpenCollaborativeMode = async () => {
    setIsLoading(true);
    await checkAndSetUser();
    setIsClearMode(false);
    setIsPrivateMode(false);
    setIsCollaborativeMode(true);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      checkAndSetUser();
    }
  }, [isSignedIn, isLoaded]);

  // Check if the URL is valid
  const isValidURL = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'arxiv.org' && parsedUrl.pathname.startsWith('/pdf/');
    } catch (error) {
      return false;
    }
  };

  // Function to handle the URL update
  const handleUpdate = () => {
    if (newURL.trim() && isValidURL(newURL)) {
      setPaperURL(newURL);
      localStorage.setItem('paperURL', newURL); // Update localStorage if needed elsewhere
      // triggerNotification('Proceeding with Paper: ' + newURL, 'info');
      setNewURL(''); // Clear the input field
    } else {
      // triggerNotification('Invalid URL. Please enter a valid arXiv PDF URL.', 'error');
    }
  };

  // Initialize paperURL from localStorage if available
  useEffect(() => {
    const storedURL = localStorage.getItem('paperURL');
    if (storedURL) {
      setPaperURL(storedURL);
    }
  }, []);

  // Fetch file data on paperURL change and on first render
  useEffect(() => {
    const fetchFileData = async () => {
      if (paperURL) {
        const pk = paperURL.substring(paperURL.lastIndexOf('/') + 1);
        let fileData = await getFileByPk(pk);

        if (fileData) {
          console.log('File exists, setting paperId...');
          // File exists, set paperId
          setPaperId(fileData.fileId);
        } else {
          console.log('File does not exist, adding...');
          // File does not exist, add it
          fileData = await addFile(paperURL);
          setPaperId(fileData.fileId);
        }
      }
    };

    fetchFileData();
  }, [paperURL]);
  
  // // Function to start/stop listening
  // const toggleListening = () => {
  //   if (isListening) {
  //     recognitionRef.current?.stop();
  //     setIsListening(false);
  //   } else {
  //     startListening();
  //     setIsListening(true);
  //   }
  // };

  // Function to initialize and start SpeechRecognition
  // const startListening = () => {
  //   const SpeechRecognition =
  //     (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  //   if (!SpeechRecognition) {
  //     alert('Your browser does not support speech recognition.');
  //     return;
  //   }

  //   const recognition = new SpeechRecognition();
  //   recognition.lang = 'en-US';
  //   recognition.interimResults = false;
  //   recognition.maxAlternatives = 1;

  //   recognition.onresult = (event: Window['SpeechRecognition']) => {
  //     const speechToText = event.results[0][0].transcript;
  //     setTranscript(speechToText);
  //     console.log('Transcribed text:', speechToText);
  //     // Proceed to handle the AI response
  //     handleAIResponse(speechToText);
  //   };

  //   recognition.onerror = (event: any) => {
  //     console.error('Speech recognition error', event.error);
  //     alert('Speech recognition error: ' + event.error);
  //     setIsListening(false);
  //   };

  //   recognition.onend = () => {
  //     setIsListening(false);
  //   };

  //   recognition.start();
  //   recognitionRef.current = recognition;
  // };

  const enableVoiceRecording = async () => {};


  // ai voice assistant
  const handleAIVoiceAssistant = async () => {
    console.log('AI Voice Assistant');
    console.log('Enabling AI Voice Assistant...');
    // planning:
    // record user voice
    // convert voice to text
    // send request to gpt-4o
    // get response
    // convert response to voice
    // play voice
  };

  // Update handleAIResponse function
  const handleAIResponse = async (userQuery: string) => {
    console.log('Handling AI response...');
    setNotification({ message: 'Processing your request...', type: 'info' });
    try {
      setIsProcessing(true);
      // Show some loading state if needed
      console.log('Sending user query to AI:', userQuery);

      // Send the transcribed text to the GPT-4o model
      const aiReply = await generateReply(userQuery);
      // const aiReply = await generateReplyPaper(userQuery);

      console.log('AI Reply:', aiReply);

      // Convert the AI reply to speech and play it
      await textToSpeech(aiReply);
    } catch (error) {
      console.error('Error handling AI response:', error);
      setNotification({ message: 'An error occurred while processing your request.', type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // send request to gpt-4o
  // generate reply for user query
  // Existing generateReply function
  const generateReply = async (prompt: string) => {
    console.log('Generating reply...');
    try {
      const response = await fetch('/api/query-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the reply.');
      return 'No response available';
    }
  };

  const getAnnotationsFromIndexDb = async () => {
    const annotations = await getAnnotationsDb();
    console.log('getAnnotationsFromIndexDb Annotations:', annotations);
    return annotations;
  }

  // query model api
  // paper analysis
  const generateReplyPaper = async (prompt: string) => {
    const anns = await getAnnotationsFromIndexDb();
    console.log('Generating reply...');
    try {
      const response = await fetch('/api/query-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, anns }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the reply.');
      return 'No response available';
    }
  };

  
  // when we get reply from gpt-4o model then we will convert it to voice and play it

  // send request to elevenlabs api
  // text to speech
  // Modify your existing textToSpeech function to accept dynamic text
  const textToSpeech = async (text: string) => {
    console.log('Converting text to speech...');
    setLoadingTextToSpeech(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const blob = await response.blob();

      // Save to IndexedDB and play
      await saveAndPlayAudio(blob);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the audio.');
    } finally {
      setLoadingTextToSpeech(false);
      startRecording();
    }
  };

  return (
    <>
      {/* Show notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Show available modes */}
      {/* Show Clean Mode */}
      {isClearMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <CleanMode paperURL={paperURL} />
        )
      )}
      {/* Show Private Mode */}
      {isPrivateMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <PrivateMode paperURL={paperURL} userInfo={userInfo!} paperId={paperId} />
        )
      )}
      {/* Show Collaborative Mode */}
      {isCollaborativeMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <CollaborativeMode paperURL={paperURL} userInfo={userInfo!} paperId={paperId} />
        )
      )}

      {/* Add new paper */}
      <div className="flex flex-row gap-3 absolute top-[8px] left-[100px] items-center">
        {/* Paper URL input */}
        <div>
          <input
            value={newURL}
            onChange={(e) => setNewURL(e.target.value)}
            autoComplete="off"
            type="text"
            name="newURL"
            placeholder="Enter your Paper URL"
            className="placeholder:text-[#747474] placeholder:text-sm text-sm w-[300px] px-2 py-1 text-[#747474] bg-white rounded border border-[#eaeaea] focus:outline-none focus:border-[#747474]"
          />
        </div>
        {/* Submit button */}
        <div className="relative flex items-center group">
          <button
            disabled={!newURL || !isValidURL(newURL)}
            onClick={handleUpdate}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-black bg-[#eaeaea] ${
              !newURL || !isValidURL(newURL)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#747474] hover:text-white cursor-pointer'
            }`}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
          <span className="absolute w-[130px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            Proceed with Paper
          </span>
        </div>
      </div>

      {/* Mode selection buttons */}
      <div className="flex flex-col gap-3 absolute top-[350px] left-[16px] bg-white p-1 shadow-md items-center">
        {/* show overlay with speech transcript with z index enabled */}
        {/* for example bg gray with padding 4 and text inside in white color. */}
        {/* also there should be close icon right top */}
        
        {/* ------------------------ */}
        {/* AI voice assistant */}
        <div className="relative flex items-center group">
          <button
            onClick={handleToggleRecording}
            className={`flex items-center justify-center p-2 rounded-md ${
              isRecording ? 'bg-red-500 text-white' : 'hover:bg-[#eaeaea] text-black'
            } cursor-pointer`}
          >
            <FontAwesomeIcon icon={faMicrophone} />
          </button>
          <span className="absolute w-[120px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            {isRecording ? 'Recording...' : 'AI Voice Assistant'}
          </span>
        </div>

      {/* Display recording status and transcript */}
      {(isRecording || transcript) && (
        <div className="fixed top-0 left-[300px] w-[1000px] h-full flex items-center justify-center text-black">
          <div className="bg-[#eeeeee] shadow-xl p-4 rounded-md w-1/2">
          <FontAwesomeIcon icon={faClose} className='bg-white py-1 px-2 mb-2 rounded-full cursor-pointer' onClick={stopRecording}/>
            <div className="flex-1 flex w-full justify-between">
              <div className="space-y-1">
                {/* <button onClick={() => {handleAIResponse(transcript)}}>Send</button> */}
                <p className="text-sm font-medium leading-none">
                  <FontAwesomeIcon icon={faRecordVinyl} className='mr-2'/>
                  {recordingComplete ? 'Recorded' : 'Recording'}
                </p>
                <p className="text-sm text-gray-500">
                  {recordingComplete ? 'Processing your request...' : 'Start speaking...'}
                </p>
              </div>
              {isRecording && (
                <div className="rounded-full w-4 h-4 bg-red-400 animate-pulse" />
              )}
            </div>
            {isRecording && (
              <div className="space-y-1 flex flex-1 items-center">
                <p className="text-sm font-medium leading-none">
                  <FontAwesomeIcon icon={faStop} className='text-red-500 mr-2 cursor-pointer text-xl' onClick={handleToggleRecording}/>
                </p>
              </div>
            )}

            {transcript && (
              <div className="border rounded-md p-2 h-full mt-4">
                <p className="mb-0">{transcript}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ------------------------ */}

        {/* Clear Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenClearMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faWandSparkles} />
          </button>
          <span className="absolute w-[80px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1 before:content-[''] before:absolute before:right-full before:top-1/2 before:transform before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-[#747474]">
            Clear Mode
          </span>
        </div>
        {/* Private Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenPrivateMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faLock} />
          </button>
          <span className="absolute w-[90px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1 before:content-[''] before:absolute before:right-full before:top-1/2 before:transform before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-[#747474]">
            Private Mode
          </span>
        </div>
        {/* Collaborative Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenCollaborativeMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faUsers} />
          </button>
          <span className="absolute w-[120px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1 before:content-[''] before:absolute before:right-full before:top-1/2 before:transform before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-[#747474]">
            Collaborative Mode
          </span>
        </div>
      </div>

      {/* Account settings */}
      <div className="absolute bottom-[20px] left-[20px]">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </>
  );
}