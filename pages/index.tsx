// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Engine, Render, Runner, Body, MouseConstraint, Composite, Mouse, World, Bodies, Events } from 'matter-js';
import SpeechRecognition from "../components/SpeechRecognition"
import * as faceapi from 'face-api.js';
import useStaticSWR from '../components/useStaticSWR'

export default function Home() {
  const [right, setRight] = useState(false);
  useEffect(() => {
    // URLからクエリパラメータを取得
    // useLocationを使用している場合: const query = new URLSearchParams(useLocation().search);
    const query = new URLSearchParams(window.location.search);
    const rightParam = query.get('right');

    // 'right' パラメータが存在し、かつ '1vw' に設定されている場合、ステートを更新
    setRight(rightParam === 'yes');
  }, []);

  const pixelRatio = 2;
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const bigRectangleRef = useRef(null);
  const [renderInstance, setRenderInstance] = useState(null);
  const [fontSize, setFontSize] = useState(null);
  const { data: inputQuery, mutate } = useStaticSWR("inputText", '');

  const videoRef = useRef();
  const [bestDetection, setBestDetection] = useState({ age: null, gender: null, image: null });
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    };
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch(err => console.error('Error starting video stream:', err));
    };
    loadModels().then(startVideo);
  }, []);

  const handleVideoOnPlay = () => {
    const intervalId = setInterval(async () => {
      if (videoRef.current) {
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withAgeAndGender();

        const resizedDetections = faceapi.resizeResults(detections, {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });

        // 最良の検出結果を選択
        if (resizedDetections.length > 0) {
          const bestDetection = resizedDetections[0];
          const age = Math.round(bestDetection.age);
          const gender = bestDetection.gender === 'male' ? '男性' : '女性';

          // 顔の切り抜き画像を作成
          const faceCanvas = document.createElement('canvas');
          const box = bestDetection.detection.box;
          const padding = 0.7; // 余白の割合
          const paddedWidth = box.width * (1 + padding);
          const paddedHeight = box.height * (1 + padding);
          const x = box.x - (box.width * padding) / 2;
          const y = box.y - (box.height * padding) / 2;
          faceCanvas.width = paddedWidth;
          faceCanvas.height = paddedHeight;
          faceCanvas.getContext('2d').drawImage(
            videoRef.current,
            x, y, paddedWidth, paddedHeight,
            0, 0, paddedWidth, paddedHeight
          );

          // 状態を更新
          setBestDetection({
            age: age,
            gender: gender,
            image: faceCanvas.toDataURL()
          });
        } else {
          // 顔が検出されない場合は情報をクリア
          setBestDetection({ age: null, gender: null, image: null });
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  };

  const coreDesires = ["挑戦欲", "優越欲", "刺激欲", "承認欲", "奉仕欲", "自主欲", "維持欲", "安全欲"]
  useEffect(() => {
    if (!renderInstance || !inputQuery) return;
    const { world } = engineRef.current;
    Composite.clear(world, false);
    bigRectangleRef.current = null;
    const abortController = new AbortController();
    coreDesires.forEach(async (desire) => {
      try {
        const response = await fetch(
          `/api?core_desire=${desire}&input=${inputQuery}`,
          { signal: abortController.signal }
        );
        const data = await response.json();
        createCircles(data, engineRef.current, renderInstance, fontSize, addSmallRectangle);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      }
    });

    return () => {
      abortController.abort();
    };
  }, [inputQuery]);


  useEffect(() => {
    if (!containerRef.current) return;
    const engine = Engine.create();
    engineRef.current = engine
    const fontSize = {
      big: calculateFontSize(4),
      medium: calculateFontSize(1.5),
      small: calculateFontSize(1.5 * .8),
    }
    setFontSize(fontSize)
    function calculateFontSize(percentage) {
      return document.documentElement.clientWidth * pixelRatio * percentage / 100;
    }

    const width = Math.floor(document.documentElement.clientWidth * pixelRatio);
    const height = Math.floor(document.documentElement.clientHeight * pixelRatio);
    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#FCF5EC'
      }
    });
    setRenderInstance(render);
    Render.run(render);
    Runner.run(Runner.create(), engine);
    engine.world.gravity.scale = 0; // デフォルトの重力を無効化
    engine.world.gravity.x = 1; // 右に向ける
    engine.world.gravity.y = 0;

    // ウインドウリサイズに伴う処理
    resizeCanvas();
    window.addEventListener('resize', handleResize);
    function handleResize() {
      resizeCanvas();
      renderBackgroundGradient();
      fontSize.big = calculateFontSize(4);
      fontSize.medium = calculateFontSize(1.5);
      setFontSize(fontSize)
      if (bigRectangleRef.current == null) return;
      Body.setPosition(bigRectangleRef.current, {
        x: (document.documentElement.clientWidth / 2) * pixelRatio,
        y: (document.documentElement.clientHeight / 2) * pixelRatio
      });
    }
    function resizeCanvas() {
      const canvas = render.canvas;
      const width = Math.floor(document.documentElement.clientWidth * pixelRatio); //メモリ上における実際のサイズを設定（ピクセル密度の分だけ倍増させます）
      const height = Math.floor(document.documentElement.clientHeight * pixelRatio);
      canvas.width = width;
      canvas.height = height;
      render.options.width = width;
      render.options.height = height;
      canvas.style.width = document.documentElement.clientWidth + 'px';
      canvas.style.height = document.documentElement.clientHeight + 'px';
    }

    function renderBackgroundGradient() {
      const ctx = render.context;
      const width = Math.floor(document.documentElement.clientWidth * pixelRatio);
      const height = Math.floor(document.documentElement.clientHeight * pixelRatio);
      const centerX = width / 2;
      const centerY = height / 2;
      const outerRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
      gradient.addColorStop(0, 'rgba(252,245,236, 0)');
      gradient.addColorStop(1, 'rgba(252,245,236, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // その他の処理
    Events.on(engine, 'afterUpdate', function () {
      for (let i = 0; i < engine.world.bodies.length; i++) {
        const body = engine.world.bodies[i];
        // 重力の強さを計算
        // const rotationForceMagnitude = 0.00001 * body.mass; // 右回転の力の強さ
        const rotationForceMagnitude = 0;
        const centerForceMagnitude = 0.001 * body.mass; // 中心の円に対する引力の強さ
        // 大きな丸の中心へのベクトルを計算
        const dx = document.documentElement.clientWidth - body.position.x;
        const dy = document.documentElement.clientHeight - body.position.y;
        // ベクトルを正規化
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalisedDx = dx / distance;
        const normalisedDy = dy / distance;
        // ベクトルを反転して右回転の力を適用
        Body.applyForce(body, body.position, {
          x: -rotationForceMagnitude * normalisedDy,
          y: rotationForceMagnitude * normalisedDx
        });
        // 中心の円に引力を適用
        Body.applyForce(body, body.position, {
          x: centerForceMagnitude * normalisedDx,
          y: centerForceMagnitude * normalisedDy
        });

        if (body.text) {
          renderText(body.text.requested_action, { x: body.position.x, y: body.position.y }, fontSize.medium, true, render);
          renderText(`${body.text.core_desire}｜${body.text.inner_need}`, {
            x: body.position.x,
            y: body.position.y - fontSize.medium * 1.3
          }, fontSize.small, false, render);
        }
      }
      renderBackgroundGradient();
      // renderText(inputQuery, {
      //   x: (document.documentElement.clientWidth / 2) * pixelRatio,
      //   y: (document.documentElement.clientHeight / 2) * pixelRatio
      // }, fontSize.big, true, render); //大きなテキストを表示
    });

    return () => {
      Render.stop(render);
      Runner.stop(Runner.create());
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', handleResize);
      Events.off(engine);
      if (render.canvas) render.canvas.remove();
    }
  }, [inputQuery]);

  // デバッグ用のプロンプト入力関数を追加
  useEffect(() => {
    window.debug = () => {
      const input = prompt("入力してください:");
      if (input) mutate(input);
    };
    return () => {
      delete window.debug;
    };
  }, []);


  return (<>
    <div ref={containerRef}></div>
    <SpeechRecognition />
    <video ref={videoRef} autoPlay onPlay={handleVideoOnPlay} className="video" />
    <div class="info" style={right ? { left: "auto", right: '1vw' } : {}}>
      {bestDetection.image && <img src={bestDetection.image} alt="Face" style={{ width: '200px', height: 'auto' }} /> || <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />}
      <p>{bestDetection.age && bestDetection.gender && (`${bestDetection.gender} ${bestDetection.age}歳`) || "----"}</p>
    </div>
    {/* {inputQuery && <iframe src={"https://www.google.com/search?igu=1&q=" + inputQuery} frameborder="0" scrolling='no' />} */}
  </>)

  // 大きな円や小さな円createCirclesの生成の部分を関数でまとめる
  function createCircles(data, engine, render, fontSize, addSmallRectangle) {
    // すべての感情パターンのフラットなリストを作成
    const flattenedEmotionalPatterns = [];
    for (let key in data.emotional_patterns) {
      for (let innerNeed in data.emotional_patterns[key]) {
        flattenedEmotionalPatterns.push({
          core_desire: key,
          inner_need: innerNeed,
          requested_action: data.emotional_patterns[key][innerNeed]
        });
      }
    }

    // 大きな円を追加
    if (!bigRectangleRef.current) addBigRectangle(inputQuery, fontSize, render, engine)

    // 小さな円を追加
    let smallRectangles = [];
    const cx = (document.documentElement.clientWidth / 2) * pixelRatio;
    const cy = (document.documentElement.clientHeight / 2) * pixelRatio;
    const r = document.documentElement.clientWidth / 1.5 * pixelRatio;  // ここで半径を設定します。適切な値に調整してください。
    flattenedEmotionalPatterns.forEach((item, i) => {
      const angle = 2 * Math.PI * i / flattenedEmotionalPatterns.length;
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      const randomOffsetX = (Math.random() - 0.5) * 500; // ランダムな数値を x および y に加えます
      const randomOffsetY = (Math.random() - 0.5) * 500;
      x += randomOffsetX;
      y += randomOffsetY;

      const smallRectangle = addSmallRectangle(item, fontSize, x, y, render, engine);
      smallRectangles.push(smallRectangle);
    });
  }

  // 大きな円を追加する関数
  function addBigRectangle(bigRectangleText, fontSize, render, engine) {
    const { world } = engine;
    let bigRectangleX = (document.documentElement.clientWidth / 2) * pixelRatio;
    let bigRectangleY = (document.documentElement.clientHeight / 2) * pixelRatio;
    const ctx = render.context;
    ctx.font = `Bold ${fontSize.big}px 'Noto Sans JP', sans-serif`;
    const textMetrics = ctx.measureText(bigRectangleText);
    const bigRectangleWidth = textMetrics.width + fontSize.big;
    const bigRectangleHeight = 2 * (textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent); // 高さを適切に調整

    bigRectangleRef.current = Bodies.rectangle(bigRectangleX, bigRectangleY, bigRectangleWidth, bigRectangleHeight, {
      chamfer: { radius: bigRectangleHeight / 2 },
      render: { fillStyle: 'rgba(0,0,0,0)' },
      friction: .5
    });
    bigRectangleRef.current.isStatic = true;
    World.add(world, bigRectangleRef.current);
  }

  // 小さい円を追加する関数
  function addSmallRectangle(
    text = {
      core_desire: "",
      inner_need: "",
      requested_action: ""
    },
    fontSize,
    x = ((Math.random() * 2 - 0.5) * document.documentElement.clientWidth * pixelRatio),
    y = ((Math.random() * 2 - 0.5) * document.documentElement.clientHeight * pixelRatio),
    render, engine
  ) {
    const { world } = engine;
    const ctx = render.context;
    const textMetrics = (() => {
      ctx.font = `Bold ${fontSize.medium}px 'Noto Sans JP', sans-serif`;
      const textMetrics1 = ctx.measureText(text.requested_action);
      ctx.font = `Bold ${fontSize.small}px 'Noto Sans JP', sans-serif`;
      const textMetrics2 = ctx.measureText(`${text.core_desire}｜${text.inner_need}`);
      return textMetrics1.width > textMetrics2.width ? textMetrics1 : textMetrics2;
    })();
    const rectangleWidth = textMetrics.width + fontSize.medium * 2.5;
    const rectangleHeight = 80 + (textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent);

    const smallRectangle = Bodies.rectangle(x, y, rectangleWidth, rectangleHeight, {
      chamfer: { radius: rectangleHeight / 2 },
      render: { fillStyle: 'rgba(0,0,0,0)' },
      friction: .5
    });
    smallRectangle.text = text;
    smallRectangle.font = `Bold ${fontSize.medium}px 'Noto Sans JP', sans-serif`;

    Body.setInertia(smallRectangle, Infinity);
    World.add(world, smallRectangle);
    return smallRectangle;
  }
}

function renderText(text, position, fontSizeValue, isBold = false, render) {
  const ctx = render.context;
  ctx.fillStyle = "#3E6A73";
  ctx.font = `${isBold ? 'Bold' : ''} ${fontSizeValue}px 'Noto Sans JP', sans-serif`;
  const textMetrics = ctx.measureText(text);
  ctx.fillText(
    text,
    position.x - textMetrics.width / 2,
    position.y + (textMetrics.fontBoundingBoxAscent - textMetrics.fontBoundingBoxDescent) / 2
  );
}