import "regenerator-runtime";
import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import useStaticSWR from '../components/useStaticSWR';
import classNames from "classnames";

export default function SpeechRecognitionComponent() {
    const [isPaused, setIsPaused] = useState(false);
    const { transcript, interimTranscript, finalTranscript, resetTranscript, listening, browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition();
    const { data, mutate } = useStaticSWR("inputText", '');
    const [texts, setTexts] = useState([
        { position: 0, text: "０言目", key: "s6anl" },
        { position: 1, text: "", key: 'nwa54k' },
        { position: 2, text: "話してみよう...", key: '10jq2b' },
        { position: 3, text: "...", key: '52twml' }
    ]);

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

    // useEffect(() => {
    //     window.d = debugInput;
    //     return () => delete window.d;
    // }, []);
    // function debugInput() {
    //     const input = prompt();
    //     if (!input) return;
    //     console.log(input);
    //     handleTranscript(input, true);
    // }

    function handleTranscript(transcript: any, isFinal = false) {
        if (isPaused) return; // 一時停止中は処理をスキップ
        if (!transcript) return;
        const foundElement = texts.find(e => e.position === 3);
        if (foundElement) foundElement.text = transcript;
        if (isFinal) {
            mutate(transcript);
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

    // 一時停止ボタンのトグル関数
    function togglePause() {
        setIsPaused(!isPaused);
    }

    return (
        <>
            <div className="speak">
                {texts.map((text) => (
                    <p
                        key={text.key}
                        className={`i_${text.position}`}
                        ref={el => { if (el) adjustFontSize(el); }}
                    >{text.text}</p>
                ))}
            </div>
            <button onClick={togglePause}
                className={classNames(
                    "stopButton",
                    { "start": isPaused }
                )}
            >
                {isPaused ? "スタート" : "音声認識をOFFに"}
            </button >
        </>
    );
}
