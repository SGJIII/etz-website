import * as THREE from "three";
import * as dat from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { detectDevice } from "./utils/detectDevice";
import { AddEventOrientationChange } from "./utils/addEventOrientationchange";
import { getElementOffsetTop } from "./utils/getElementOffsetTop";
import { disableBodyScroll, enableBodyScroll } from "./utils/scroll";
import { launchSlider } from "./benefits-slider";

const FIRST_SECTION_CLASS = ".HeaderSection";
const SECOND_SECTION_CLASS = ".BenefitsSection";
const MODEL_NAME = "etz_8_1.glb";

class MobileModel {
  gltfLoader = null;
  phoneMesh = null;
  videoTexture = null;
  videoTexture2 = null;
  buyBtnMesh = null;
  sellBtnMesh = null;
  transactionsBtnMesh = null;
  assetsMesh = null;
  shadowMesh = null;
  mixer = null;
  mixer2 = null;
  mixer3 = null;
  mixer4 = null;
  mixer5 = null;
  shadowLayer = null;
  animationDuration = 0;
  scene = null;
  environmentMap = null;
  debugObject = {};
  secondSection = null;
  startPositionY = 0;
  startPositionX = 0;
  endPositionY = 0;
  endPositionX = 0;

  isLoadedModel = false;
  isLoadedVideoGraph = false;
  isLoadedVideoFlow = false;

  prevStatus = "start";

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.scene = new THREE.Scene();
    this.secondSection = document.querySelector(SECOND_SECTION_CLASS);
  }

  init() {
    this.loadMobileModel();
    this.startHandleMobileAnimation();

    window.addEventListener("resize", () => {
      this.calculateStartPosition();
      this.calculateEndPosition();
    });
    AddEventOrientationChange(() => {
      this.calculateStartPosition();
      this.calculateEndPosition();
    });
    this.calculateStartPosition();
    this.calculateEndPosition();
  }

  checkLoader() {
    if (video.readyState === 4) {
      this.isLoadedVideoGraph = true;
    }
    // if (video2.readyState === 4) {
    //   this.isLoadedVideoFlow = true;
    // }

    if (
      this.isLoadedModel &&
      // this.isLoadedVideoFlow &&
      this.isLoadedVideoGraph
    ) {
      const loader = document.querySelector("[name-loader]");
      const loaderStatus = loader.getAttribute("data-status");
      if (loaderStatus === "hidden") return;
      document.body.style.overflow = "";
      loader.classList.add("Loader__disapoint");
      loader.setAttribute("data-status", "hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 400);
      return;
    }

    window.requestAnimationFrame(this.checkLoader.bind(this));
  }

  setupInitialValue(gltf) {
    if (window.innerWidth > 1200) {
      if (
        window.innerWidth < 1000 &&
        window.matchMedia("(orientation: landscape)").matches
      ) {
        gltf.scene.scale.set(1.7, 1.7, 1.7);
        gltf.scene.position.set(3.2, 0, 0);
      } else {
        gltf.scene.scale.set(1.7, 1.7, 1.7);
        gltf.scene.position.set(2.2, -0.3, 0);
      }
    } else if (window.innerWidth < 768) {
      if (window.matchMedia("(orientation: landscape)").matches) {
        gltf.scene.scale.set(2, 2, 2);
        gltf.scene.position.set(0.9, 0, 0);
      } else {
        const scaleSize = Number(
          window.innerHeight * 0.001421800947867
        ).toFixed(3);
        gltf.scene.scale.set(scaleSize, scaleSize, scaleSize);
        gltf.scene.position.set(0, 0, 0);
      }
    } else {
      gltf.scene.scale.set(2, 2, 2);
      gltf.scene.position.set(0.9, 0, 0);
    }
  }

  /**
   * Load mobile model
   */
  loadMobileModel() {
    const cubeTextureLoader = new THREE.CubeTextureLoader();

    this.environmentMap = cubeTextureLoader.load([
      "/textures/px.jpg",
      "/textures/nx.jpg",
      "/textures/py.jpg",
      "/textures/ny.jpg",
      "/textures/pz.jpg",
      "/textures/nz.jpg",
    ]);

    this.environmentMap.rotation = Math.PI * 0.25;
    this.environmentMap.outputEncoding = THREE.sRGBEncoding;

    this.scene.environment = this.environmentMap;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");

    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.gltfLoader.load(MODEL_NAME, (gltf) => {
      this.setupInitialValue(gltf);
      AddEventOrientationChange(() => {
        this.setupInitialValue(gltf);
      });
      window.addEventListener("resize", () => {
        if (!detectDevice()) {
          this.setupInitialValue(gltf);
        }
      });
      this.phoneMesh = gltf.scene.children[0].children[0];
      this.phoneMesh.material.map = this.videoTexture;
      // All meshes
      this.scene.add(gltf.scene);

      this.buyBtnMesh = gltf.scene.children[0].children.find(
        (c) => c.name === "buy"
      );
      this.sellBtnMesh = gltf.scene.children[0].children.find(
        (c) => c.name === "sell"
      );
      this.transactionsBtnMesh = gltf.scene.children[0].children.find(
        (c) => c.name === "transactions"
      );
      this.assetsMesh = gltf.scene.children[0].children.find(
        (c) => c.name === "assets"
      );
      this.shadowMesh = gltf.scene.children[0].children.find(
        (c) => c.name === "shadow"
      );

      this.phoneMesh.material.metalness = 1.2;
      this.phoneMesh.material.roughness = 1;

      this.phoneMesh.receiveShadow = true;

      video.play();
      video2.play();

      // Animation
      this.mixer = new THREE.AnimationMixer(gltf.scene);

      const animIphoneRotation = gltf.animations.find(
        (a) => a.name === "rotatePhone"
      );
      const animDropBuy = gltf.animations.find((a) => a.name === "dropBuy");
      const animDropSell = gltf.animations.find((a) => a.name === "dropSell");
      const animDropTransactions = gltf.animations.find(
        (a) => a.name === "dropTransactions"
      );
      const animDropAssets = gltf.animations.find(
        (a) => a.name === "dropAssets"
      );
      this.shadowLayer = gltf.scene.children[0].children.find(
        (a) => a.name === "shadow"
      );

      this.animationDuration = animIphoneRotation.duration * 0.999;
      this.mixer.clipAction(animIphoneRotation).play();

      this.mixer2 = new THREE.AnimationMixer(gltf.scene);
      this.mixer2.clipAction(animDropBuy).play();

      this.mixer3 = new THREE.AnimationMixer(gltf.scene);
      this.mixer3.clipAction(animDropSell).play();

      this.mixer4 = new THREE.AnimationMixer(gltf.scene);
      this.mixer4.clipAction(animDropTransactions).play();

      this.mixer5 = new THREE.AnimationMixer(gltf.scene);
      this.mixer5.clipAction(animDropAssets).play();

      this.updateAllMaterials();

      this.isLoadedModel = true;
      this.checkLoader();
    });
  }

  calculateStartPosition() {
    const description = document.querySelector(
      "[ name-header-section-description]"
    );
    const bodyRect = document.body.getBoundingClientRect();
    const elemRect = description.getBoundingClientRect();
    const offset = elemRect.top - bodyRect.top;
    if (window.innerWidth > window.innerHeight) {
      this.startPositionY = offset + elemRect.height;
    } else {
      if (window.innerWidth <= 768) {
        this.startPositionY = offset - 40;
      } else {
        this.startPositionY = -offset - elemRect.height;
      }
    }

    if (window.innerHeight <= 600) {
      this.startPositionX = window.innerWidth / 2 - window.innerHeight / 2;
    } else {
      this.startPositionX = window.innerWidth / 2 - 400;
    }
  }

  calculateEndPosition() {
    if (window.innerWidth > window.innerHeight) {
      if (window.innerHeight <= 600) {
        this.endPositionY = 60;
        this.endPositionX = window.innerWidth - window.innerHeight;
      } else {
        this.endPositionY = 0;
        this.endPositionX = window.innerWidth - 600;
      }
    } else {
      if (window.innerWidth > 1200) {
      } else if (window.innerWidth <= 768) {
        if (
          window.innerWidth < 768 &&
          window.matchMedia("(orientation: landscape)").matches
        ) {
          this.endPositionY = -55;
          this.endPositionX = window.innerWidth - 300;
        } else {
          this.endPositionY = -110;
          this.endPositionX = window.innerWidth - 600;
        }
      } else {
        this.endPositionY = window.innerHeight / 2 - 300;
        this.endPositionX = window.innerWidth - 600;
      }
    }
  }

  /**
   * Update all materials
   */
  updateAllMaterials() {
    this.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.envMap = this.environmentMap;
        child.material.envMapIntensity = this.debugObject.envMapIntensity;
        child.material.needsUpdate = true;
      }
    });
  }

  togglePhoneAssets(v) {
    this.buyBtnMesh.visible = v;
    this.sellBtnMesh.visible = v;
    this.transactionsBtnMesh.visible = v;
    this.assetsMesh.visible = v;
    this.shadowMesh.visible = v;
  }

  startHandleMobileAnimation() {
    // Debug
    this.debugObject.envMapIntensity = 0.6;

    // Canvas
    const canvas = document.querySelector("canvas.webgl");

    /**
     * Models
     */

    let video = document.getElementById("video");

    window.video = video;
    this.videoTexture = new THREE.VideoTexture(video);
    this.videoTexture.rotation = Math.PI;
    this.videoTexture.center.x = 0.5;
    this.videoTexture.center.y = 0.5;
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.wrapS = THREE.RepeatWrapping;
    this.videoTexture.repeat.x = -1;

    let video2 = document.getElementById("video2");

    window.video2 = video2;
    this.videoTexture2 = new THREE.VideoTexture(video2);
    this.videoTexture2.rotation = Math.PI;
    this.videoTexture2.center.x = 0.5;
    this.videoTexture2.center.y = 0.5;
    this.videoTexture2.minFilter = THREE.LinearFilter;
    this.videoTexture2.magFilter = THREE.LinearFilter;
    this.videoTexture2.wrapS = THREE.RepeatWrapping;
    this.videoTexture2.repeat.x = -1;

    const phoneBlock = document.querySelector("canvas");
    /**
     * Lights
     */

    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.558);
    directionalLight.position.set(-3.11, 1.56, 5);

    this.scene.add(directionalLight);
    const mainSection = document.querySelector(FIRST_SECTION_CLASS);

    const innerWidth =
      (document.documentElement.clientWidth || window.innerWidth) - 20;
    /**
     * Sizes
     */
    const sizes = {
      width: innerWidth,
      height: mainSection.getBoundingClientRect().height,
    };

    if (window.innerWidth > 768 && window.innerWidth <= 1200) {
      // Update sizes
      if (window.innerHeight <= 600) {
        sizes.width = window.innerHeight;
        sizes.height = window.innerHeight;
      } else {
        sizes.width = 600;
        sizes.height = 600;
      }
    } else {
      if (
        window.innerWidth < 768 &&
        window.matchMedia("(orientation: landscape)").matches
      ) {
        sizes.width = 300;
        sizes.height = 300;
      } else {
        // Update sizes
        sizes.width = innerWidth;
        sizes.height = mainSection.getBoundingClientRect().height;
      }
    }

    const setSizesScene = (name) => {
      if (window.innerWidth > 768 && window.innerWidth <= 1200) {
        // Update sizes
        if (window.innerHeight <= 600) {
          sizes.width = window.innerHeight;
          sizes.height = window.innerHeight;
        } else {
          sizes.width = 600;
          sizes.height = 600;
        }
      } else {
        // Update sizes
        if (
          window.innerWidth < 768 &&
          window.matchMedia("(orientation: landscape)").matches
        ) {
          sizes.width = 300;
          sizes.height = 300;
        } else {
          sizes.width = innerWidth;
          sizes.height = mainSection.getBoundingClientRect().height;
        }
      }

      // Update camera
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener("resize", () => {
      if (detectDevice()) return;
      setSizesScene("resize");
    });

    AddEventOrientationChange(() => {
      setSizesScene("orientationchange");
    });

    /**
     * Camera
     */
    // Base camera
    const camera = new THREE.PerspectiveCamera(
      12,
      sizes.width / sizes.height,
      0.1,
      100
    );
    camera.position.set(0, 0, 25);

    this.scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enabled = false;
    controls.enableDamping = false;

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sizes.width, sizes.height);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /**
     * Animate
     */
    const clock = new THREE.Clock();
    let previousTime = 0;

    let mouseWheelDeltaDistance = 0;
    let mouseWheelRatio = 0;

    /**
     * GUI
     */
    const slider = document.querySelector("[name-benefits-section]");
    let isStartSlider = false;

    let isLeave = false;
    const tick = () => {
      let scrollTopFrame =
        document.body.scrollTop || document.documentElement.scrollTop;

      const launchAnimation = () => {
        mouseWheelRatio = 1;
      };
      const elapsedTime = clock.getElapsedTime();
      previousTime = elapsedTime;

      const mouseWheelDistance = getElementOffsetTop(this.secondSection);

      if (scrollTopFrame >= 0 && scrollTopFrame <= mouseWheelDistance - 100) {
        mouseWheelDeltaDistance = scrollTopFrame;

        if (mouseWheelDeltaDistance > mouseWheelDistance) {
          mouseWheelDeltaDistance = mouseWheelDistance;
        } else if (mouseWheelDeltaDistance < 0) {
          mouseWheelDeltaDistance = 0;
        }

        mouseWheelRatio = mouseWheelDeltaDistance / mouseWheelDistance;
      }

      // Slider behavior
      if (scrollTopFrame >= mouseWheelDistance) {
        if (isStartSlider === false) {
          isStartSlider = true;
          disableBodyScroll(slider);
          phoneBlock.setAttribute("data-status", "stop");
          setTimeout(() => {
            enableBodyScroll(slider);
            phoneBlock.setAttribute("data-status", "start");
          }, 1000);
          launchSlider();
        }
      }

      const scrollStatus = phoneBlock.getAttribute("data-status");

      const handleMotionForDesktop = () => {
        if (scrollTopFrame >= mouseWheelDistance) {
          launchAnimation();
          phoneBlock.style.transform = `translate3d(0,${mouseWheelDistance}px,0)`;
          phoneBlock.style.position = "absolute";
          return;
        }
        phoneBlock.style.transform = ``;
        phoneBlock.style.position = "fixed";
      };

      const handleMotionForMobile = () => {
        if (scrollTopFrame >= mouseWheelDistance) {
          if (isLeave === true) return;
          isLeave = true;
          launchAnimation();
          phoneBlock.style.transform = `translate3d(0,${
            mouseWheelDistance + this.endPositionY
          }px,0)`;
          phoneBlock.style.position = "absolute";
          return;
        }
        if (scrollTopFrame >= mouseWheelDistance - 100) {
          if (isLeave === true) return;
          isLeave = true;
          launchAnimation();
        }
        if (scrollStatus === "stop") {
          launchAnimation();
          phoneBlock.style.transform = `translate3d(0,${
            mouseWheelDistance + this.endPositionY
          }px,0)`;
          phoneBlock.style.position = "absolute";
          return;
        }
        const deltaY =
          this.startPositionY +
          ((this.endPositionY - this.startPositionY) / mouseWheelDistance) *
            scrollTopFrame;
        phoneBlock.style.transform = `translate3d(0,${deltaY}px,0)`;
        phoneBlock.style.position = "fixed";
        isLeave = false;
      };

      const handleMotionForTablet = () => {
        if (scrollTopFrame >= mouseWheelDistance) {
          launchAnimation();
          const deltaY =
            this.endPositionY - scrollTopFrame + mouseWheelDistance;
          phoneBlock.style.transform = `translate3d(${this.endPositionX}px,${deltaY}px,0)`;
          phoneBlock.style.position = "fixed";
          const sum = mouseWheelDistance + this.endPositionY;
          phoneBlock.style.transform = `translate3d(${this.endPositionX}px,${sum}px,0)`;
          phoneBlock.style.position = "absolute";
          return;
        }
        if (scrollStatus === "stop") {
          launchAnimation();
          phoneBlock.style.transform = `translate3d(${this.endPositionX}px,${
            mouseWheelDistance + this.endPositionY
          }px,0)`;
          phoneBlock.style.position = "absolute";
          return;
        }
        const deltaY =
          Math.abs(this.startPositionY) +
          ((this.endPositionY - Math.abs(this.startPositionY)) /
            mouseWheelDistance) *
            scrollTopFrame;
        const deltaX =
          this.startPositionX +
          ((this.endPositionX - this.startPositionX) / mouseWheelDistance) *
            scrollTopFrame;
        phoneBlock.style.transform = `translate3d(${deltaX}px,${deltaY}px,0)`;
        phoneBlock.style.position = "fixed";
      };

      if (window.innerWidth > 1200) {
        handleMotionForDesktop();
      } else if (window.innerWidth <= 768) {
        if (
          window.innerWidth < 768 &&
          window.matchMedia("(orientation: landscape)").matches
        ) {
          handleMotionForTablet();
        } else {
          handleMotionForMobile();
        }
      } else {
        handleMotionForTablet();
      }

      const START_OPACITY = 0.2;

      let opacityValue = START_OPACITY;

      if (this.shadowLayer) {
        if (mouseWheelRatio <= 0.8) {
          opacityValue = 0.2 + mouseWheelRatio;
        }

        if (mouseWheelRatio > 0.8) {
          opacityValue = 1 - (mouseWheelRatio - 0.8) * 5;
        }

        if (mouseWheelRatio >= 1) {
          opacityValue = 0;
        }

        if (mouseWheelRatio >= 1) {
          this.phoneMesh.material.map = this.videoTexture2;
          video2.play();
          video.currentTime = 0;
          video.pause();
          this.togglePhoneAssets(false);
        } else {
          this.phoneMesh.material.map = this.videoTexture;
          video.play();
          video2.currentTime = 0;
          video2.pause();
          this.togglePhoneAssets(true);
        }

        this.shadowLayer.material.opacity = opacityValue;
      }

      // // Model animation
      if (
        this.mixer &&
        this.mixer2 &&
        this.mixer3 &&
        this.mixer4 &&
        this.mixer5
      ) {
        this.mixer.setTime(mouseWheelRatio * this.animationDuration);
        this.mixer2.setTime(mouseWheelRatio * this.animationDuration);
        this.mixer3.setTime(mouseWheelRatio * this.animationDuration);
        this.mixer4.setTime(mouseWheelRatio * this.animationDuration);
        this.mixer5.setTime(mouseWheelRatio * this.animationDuration);
      }

      this.videoTexture.needsUpdate = true;

      // Render
      renderer.render(this.scene, camera);

      // Call tick again on the next frame
      window.requestAnimationFrame(tick.bind(this));
    };
    tick();
  }
}
const mobileModel = new MobileModel("[name-mobile-model]");

try {
  mobileModel.init();
} catch (error) {
  console.log(error);
  setTimeout(() => {
    mobileModel.init();
  }, 100);
}
