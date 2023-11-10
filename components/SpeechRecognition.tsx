import "regenerator-runtime";
import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import useStaticSWR from 'components/useStaticSWR'

export default () => {
    const { transcript, interimTranscript, finalTranscript, resetTranscript, listening, browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition();
    const { data, mutate } = useStaticSWR("inputText", '');
    useEffect(() => {
        if (!browserSupportsSpeechRecognition) alert('ブラウザが音声認識をサポートしていません。');
        if (!isMicrophoneAvailable) alert('マイクが利用できません。');
    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable]);

    const [texts, setTexts] = useState([
        { position: 0, text: "０言目", key: "s6anl" },
        { position: 1, text: "１言目", key: 'nwa54k' },
        { position: 2, text: "２言目", key: '10jq2b' },
        { position: 3, text: "...", key: '52twml' }
    ]);
    useEffect(() => {
        if (!interimTranscript) return
        var foundElement = texts.find(e => e.position === 3);
        if (foundElement) foundElement.text = interimTranscript;
    }, [interimTranscript]);

    useEffect(() => {
        if (!finalTranscript) return
        mutate(finalTranscript);
        var foundElement = texts.find(e => e.position === 3);
        if (foundElement) foundElement.text = finalTranscript;

        let prev = texts.slice(-3).map((e) => {
            e.position = e.position - 1;
            return e
        })
        setTexts([...prev, {
            position: 3,
            text: "...",
            key: Math.random().toString(36).substring(7)
        }]);
        resetTranscript();
    }, [finalTranscript]);

    function adjustFontSize(element) {
        let fontSize = parseInt(window.getComputedStyle(element, null).getPropertyValue('font-size'));
        while (element.scrollHeight > (element.offsetHeight + fontSize / 2) && fontSize > 1) {
            fontSize--;
            element.style.fontSize = fontSize + "px";
        }
    }

    return (
        <>
            <div className="speak">
                {texts.map((text, index) => (
                    <p
                        key={text.key}
                        className={`i_${text.position}`}
                        ref={el => { if (el) adjustFontSize(el) }}
                    >{text.text}</p>
                ))}
            </div>
            {!listening &&
                <button
                    onClick={() => SpeechRecognition.startListening({
                        continuous: true,
                        language: 'ja-JP'
                    })}
                >　開始　</button>}
        </>
    );
}