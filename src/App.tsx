import { useState, useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Amplify } from 'aws-amplify'
import { events } from 'aws-amplify/data'
import config from './amplify_outputs.json'

Amplify.configure({
  API: {
    Events: {
      endpoint: config.API.Events.endpoint,
      region: config.API.Events.region,
      apiKey: config.API.Events.apiKey,
      defaultAuthMode: config.API.Events.defaultAuthMode as 'apiKey',
    },
  },
})

function App() {
  const [streamedMessage, setStreamedMessage] = useState<string>('')
  const subscriptionRef = useRef<any>(null)
  const connectionRef = useRef<Promise<any> | null>(null)

  useEffect(() => {
    if (subscriptionRef.current || connectionRef.current) return;

    connectionRef.current = events.connect('/default/bedrock-test')

    connectionRef.current.then((channel) => {
      if (subscriptionRef.current) {
        return;
      }

      subscriptionRef.current = channel.subscribe({
        next: (data: any) => {
          console.log("Received data:", data); 

          try {
            const chunk =
              typeof data.event.message === "string"
                ? data.event.message
                : JSON.stringify(data.event.message);

            setStreamedMessage(prevMessage => {
              if (prevMessage.endsWith(chunk)) {
                return prevMessage;
              }
              return prevMessage + chunk;
            });
          } catch (error) {
            console.error("Error parsing event message:", error);
          }
        },
        error: (error: any) => {
          console.error("Subscription error:", error);
        },
      });
    }).catch(error => {
      console.error("Connection error:", error);
      connectionRef.current = null;
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      connectionRef.current = null;
    };
  }, []);

  const handleClick = async () => {
    await fetch('<enter-your-api-gateway-url>', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Invocation-Type': 'Event',
      },
      body: JSON.stringify({}),
    });
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={handleClick}>Call Lambda Function!</button>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
          {streamedMessage}
        </div>
      </div>
    </>
  )
}

export default App
