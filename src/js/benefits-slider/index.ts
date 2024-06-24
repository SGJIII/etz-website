import { easeInOutQuad } from "../utils/easeInOutQuad";
import { AddEventOrientationChange } from "../utils/addEventOrientationchange";

type TimeoutId = ReturnType<typeof setTimeout> | undefined;

class BenefitsSlider {
  static activeSlideIdx = 0;
  static timeSlideWithoutPause = 3000;
  static timeSlideWithPause = 2000;
  static __idSliderInterval: TimeoutId = undefined;
  static __idSliderClick: TimeoutId = undefined;
  static isLaunchSlider = false;
  static dots: Array<HTMLElement> | null = [];
  static prevIdActiveSlide = 0;
  static positon = 0;
  static widthSlides: number[] = [];
  static slides: NodeListOf<HTMLElement> | null = null;
  static dotsContainder: HTMLElement | null = null;
  static containder: HTMLElement | null = null;
  static activeSlide: HTMLElement | null = null;

  public init() {
    this.createDots();
  }

  static nextSlide() {
    if (!BenefitsSlider.dots) return;
    BenefitsSlider.activeSlideIdx++;
    if (BenefitsSlider.activeSlideIdx > BenefitsSlider.dots.length - 1) {
      BenefitsSlider.activeSlideIdx = 0;
    }
    BenefitsSlider.changeActiveSlide(BenefitsSlider.activeSlideIdx);
  }

  static launchSlider() {
    BenefitsSlider.isLaunchSlider = true;
    BenefitsSlider.__idSliderInterval = setInterval(() => {
      BenefitsSlider.nextSlide();
    }, BenefitsSlider.timeSlideWithoutPause);
  }

  private createDots() {
    BenefitsSlider.slides = document.querySelectorAll<HTMLElement>(
      "[name-benefits-slide]"
    );

    BenefitsSlider.dotsContainder = document.querySelector(
      "[name-benefits-slider-dots-container]"
    );
    BenefitsSlider.containder = document.querySelector(
      "[name-benefits-slider-container]"
    );
    const calculateWidthDots = (slide: HTMLElement) => {
      const width = slide.getBoundingClientRect().width;
      BenefitsSlider.widthSlides.push(width);
    };

    AddEventOrientationChange(() => {
      BenefitsSlider.widthSlides = [];
      BenefitsSlider.slides?.forEach((slide) => {
        calculateWidthDots(slide);
      });
    });

    BenefitsSlider.slides.forEach((slide, idx) => {
      calculateWidthDots(slide);
      const dot = document.createElement("span");
      dot.setAttribute("data-status", idx === 0 ? "active" : "idle");
      dot.setAttribute("name-benefits-slider-dot", "");
      dot.className = "BenefitsSection_dot";

      dot.addEventListener("click", () => {
        BenefitsSlider.changeActiveSlide(idx);
        clearTimeout(BenefitsSlider.__idSliderInterval);
        clearTimeout(BenefitsSlider.__idSliderClick);
        BenefitsSlider.__idSliderClick = setTimeout(() => {
          BenefitsSlider.launchSlider();
        }, BenefitsSlider.timeSlideWithPause);
      });

      BenefitsSlider.dotsContainder?.appendChild(dot);
      BenefitsSlider.dots?.push(dot);
    });

    BenefitsSlider.activeSlide = BenefitsSlider.slides[0];
  }

  static changePosition(step: number, progress = 0) {
    if (BenefitsSlider.slides === null) return;

    const widthContainer =
      BenefitsSlider.containder?.getBoundingClientRect()?.width ?? 0;
    const widthSlide =
      BenefitsSlider.slides[
        BenefitsSlider.activeSlideIdx
      ]?.getBoundingClientRect()?.width ?? 0;
    const widthActiveSlide =
      BenefitsSlider.activeSlide?.getBoundingClientRect()?.width ?? 0;

    const isRigthDirection =
      BenefitsSlider.prevIdActiveSlide < BenefitsSlider.activeSlideIdx;

    const positionSlide = isRigthDirection
      ? widthContainer + widthSlide
      : -widthContainer - widthSlide;
    const positionActiveSlide = isRigthDirection
      ? widthContainer + widthActiveSlide
      : -widthContainer - widthActiveSlide;

    BenefitsSlider.slides.forEach((slide) => {
      if (BenefitsSlider.slides === null) return;
      if (
        slide !== BenefitsSlider.slides[BenefitsSlider.activeSlideIdx] ||
        slide !== BenefitsSlider.slides[BenefitsSlider.prevIdActiveSlide]
      ) {
        slide.setAttribute(
          "style",
          `transform: translateX(${window.innerWidth}px)`
        );
      }
    });

    BenefitsSlider.slides[BenefitsSlider.activeSlideIdx]?.setAttribute(
      "style",
      `transform: translateX(${
        positionSlide - positionSlide * easeInOutQuad(progress)
      }px)`
    );

    BenefitsSlider.activeSlide?.setAttribute(
      "style",
      `transform: translateX(${-(
        0 +
        positionActiveSlide * easeInOutQuad(progress)
      )}px)`
    );

    progress += step;
    if (progress < 1) {
      requestAnimationFrame(() =>
        BenefitsSlider.changePosition(step, progress)
      );
      return;
    }

    BenefitsSlider.slides[BenefitsSlider.activeSlideIdx]?.setAttribute(
      "style",
      `transform: translateX(${-BenefitsSlider.positon}px)`
    );

    BenefitsSlider.activeSlide =
      BenefitsSlider.slides[BenefitsSlider.activeSlideIdx];
    BenefitsSlider.prevIdActiveSlide = BenefitsSlider.activeSlideIdx;
  }

  static changeActiveSlide(activeIdx: number) {
    BenefitsSlider.activeSlideIdx = activeIdx;
    const step = 1 / 42;
    BenefitsSlider.changePosition(step);
    const handleStatus = (el: HTMLElement, idx: number) => {
      el.setAttribute("data-status", idx === activeIdx ? "active" : "idle");
    };
    BenefitsSlider.dots?.forEach(handleStatus);
  }
}

export default BenefitsSlider;
export const launchSlider = BenefitsSlider.launchSlider;
