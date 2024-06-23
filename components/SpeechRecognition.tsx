import "regenerator-runtime";
import { use, useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import useStaticSWR from '../components/useStaticSWR';
import classNames from "classnames";

export default function SpeechRecognitionComponent() {
    const [isInitializing, setIsInitializing] = useState(true);
    const { transcript, interimTranscript, finalTranscript, resetTranscript, listening, browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition();
    const { data: inputQuery, mutate: setInput } = useStaticSWR("inputText", '');
    const [texts, setTexts] = useState([
        { position: 0, text: "０言目", key: "s6anl" },
        { position: 1, text: "", key: 'nwa54k' },
        { position: 2, text: "あなたの発言を待っています", key: 'initialMessage' },
        { position: 3, text: "...", key: '52twml' }
    ]);

    useEffect(() => {
        if (!navigator.onLine) alert('ネットワークに接続されていません。');
    }, [inputQuery]);

    useEffect(() => {
        if (!browserSupportsSpeechRecognition) alert('ブラウザが音声認識をサポートしていません。');
        if (!isMicrophoneAvailable) alert('マイクが利用できません。');

        // 自動でマイク入力を開始
        if (browserSupportsSpeechRecognition && isMicrophoneAvailable) {
            SpeechRecognition.startListening({
                continuous: true,
                language: 'ja-JP'
            });
        }

    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable]);

    useEffect(() => handleTranscript(interimTranscript), [interimTranscript]);
    useEffect(() => handleTranscript(finalTranscript, true), [finalTranscript]);

    function handleTranscript(transcript: any, isFinal = false) {
        if (!transcript) return;
        if (isInitializing) setIsInitializing(false);
        const foundElement = texts.find(e => e.position === 3);
        if (foundElement) foundElement.text = transcript;
        if (isFinal) {
            setInput(transcript); //確定した発言の受け渡し
            updateTexts();
            resetTranscript();
        }
    }

    function updateTexts() {
        const prev = texts.slice(-3).map((e) => {
            e.position = e.position - 1;
            return e;
        });
        setTexts([...prev, {
            position: 3,
            text: "...",
            key: Math.random().toString(36).substring(7)
        }]);
    }

    function adjustFontSize(element: any) {
        let fontSize = parseInt(window.getComputedStyle(element, null).getPropertyValue('font-size'));
        while (element.scrollHeight > element.offsetHeight + fontSize / 2 && fontSize > 1) {
            fontSize--;
            element.style.fontSize = fontSize + "px";
        }
    }

    function toggleListening() {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            SpeechRecognition.startListening({
                continuous: true,
                language: 'ja-JP'
            });
        }
        resetTranscript();
    }

    return (
        <>
            <div className={classNames("speak", { "initializing": !isInitializing })}>
                {texts.map((text) => (
                    <p
                        key={text.key}
                        className={classNames(`i_${text.position}`, text.key)}
                        ref={el => { if (el) adjustFontSize(el); }}
                    >{text.text}</p>
                ))}
            </div >
            <button
                onClick={toggleListening}
                className={classNames(
                    "stopButton",
                    { "start": !listening }
                )}
            />
        </>
    );
}
