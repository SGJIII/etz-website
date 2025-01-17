import WorkspaceElementAll from "../utils/workspaceElementAll";
import { getElementOffsetTop } from "../utils/getElementOffsetTop";

type Callback = () => void;
class Links extends WorkspaceElementAll<HTMLLinkElement> {
  private static arrayCallback: (() => void | never)[] = [];
  init() {
    this.initClickEvent(this);
  }

  public static addLinkClickCallback(callback: Callback) {
    Links.arrayCallback.push(callback);
  }

  public static calculatePositionLink(name: string | null) {
    if (name === null) return 0;
    const element = document.querySelector(name);
    const body = document.body.getBoundingClientRect();
    const rect = element?.getBoundingClientRect();
    let position = Math.abs((rect?.top ?? 0) - body.top);
    let heightMenu = 106;
    let marginBottomMenu = 0;

    if (window.innerWidth > 1200) {
      const deltaYCenter =
        window.innerHeight / 2 - ((rect?.height ?? 0) + heightMenu) / 2;
      switch (name) {
        case "#contact-us":
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
        case "#benefits":
          marginBottomMenu = -1;
          position = position - marginBottomMenu;
          break;
        case "#etz-mobile":
          position = position - deltaYCenter;
          position = position - marginBottomMenu - heightMenu / 2;
          break;
        default:
          marginBottomMenu = 64;
          position = position - marginBottomMenu - heightMenu;
          break;
      }
    } else if (window.innerWidth > 768 && window.innerWidth <= 1200) {
      marginBottomMenu = 20;
      heightMenu = 70;
      switch (name) {
        case "#benefits":
          marginBottomMenu = 5;
          if (window.innerHeight <= 600) {
            position = getElementOffsetTop(element) + 32;
          } else {
            position = getElementOffsetTop(element);
          }
          break;
        case "#etz-mobile":
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
        case "#quick-start":
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
        case "#crypto":
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
        case "#contact-us":
          if (window.innerHeight <= 600) {
            marginBottomMenu = 0;
            heightMenu = -20;
          }
          position = position - marginBottomMenu - heightMenu;
          break;
        default:
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
      }
    } else if (window.innerWidth <= 768) {
      marginBottomMenu = 20;
      heightMenu = 76;
      switch (name) {
        case "#benefits":
          marginBottomMenu = 5;
          position = getElementOffsetTop(element);
          break;
        case "#etz-mobile":
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
        case "#contact-us":
          marginBottomMenu = 0;
          heightMenu = 56;
          position = position - marginBottomMenu - heightMenu;
          break;
        default:
          marginBottomMenu = 0;
          position = position - marginBottomMenu - heightMenu;
          break;
      }
    }

    return position;
  }

  private isHrefToOwnAnchor(href: string): boolean {
    const splitted = href.split("#");

    if (splitted.length < 2) {
      return false;
    }

    if (splitted[0] === "") {
      return true;
    }

    const hrefPage =
      splitted[0] === "/" ? splitted[0] : splitted[0].replace("/", "");

    const pathname =
      location.pathname === "/"
        ? location.pathname
        : location.pathname.replace("/", "");

    return pathname === hrefPage;
  }

  private getHashFromHref(href: string): string {
    const splitted = href.split("#");
    return splitted[1] ? `#${splitted[1]}` : "";
  }

  public initClickEvent(_self: Links) {
    this.elements?.forEach((link) => {
      const href = link.getAttribute("href");
      link.addEventListener("click", function (e) {
        if (!_self.isHrefToOwnAnchor(href ?? "")) {
          return;
        }
        e.preventDefault();

        const hash = _self.getHashFromHref(href ?? "");

        Links.arrayCallback.forEach((callback) => {
          if (typeof callback === "function") {
            callback();
          }
        });
        const isInstantScroll = link.getAttribute("data-scroll");
        window.scrollTo({
          top: Links.calculatePositionLink(hash),
          behavior: isInstantScroll ? "auto" : "smooth",
        });
      });
    });
  }
}

const links = new Links("[name-link]");
links.init();

export const addLinkClickCallback = Links.addLinkClickCallback;
export const calculatePositionLink = Links.calculatePositionLink;
