// ==UserScript==
// @name         yc-直接跳转文本链接
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  识别并直接跳转普通文本链接
// @author       wcbblll
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 移除重复项
  function removeDuplicates(arr) {
    return arr.filter((item, index, self) => self.indexOf(item) === index);
  }

  // 从后往前遍历数组

  function traverseArrayBackward(arr, callback) {
    for (let i = arr.length - 1; i >= 0; i--) {
      callback(arr[i], i, i === 0);
    }
  }

  // 文本全局匹配链接返回数组，数组里面是字符串
  function getTextLinks(text) {
    // const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const linkRegex = /((https?:\/\/)?|(\/\/))?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const links = text.match(linkRegex);
    return links || [];
  }

  // 文本全局匹配链接返回数组，数组里面是对象
  function getTextLinksList(text) {
    // const linkRegex = /https?:(\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const linkRegex = /((https?:\/\/)?|(\/\/))?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = text.matchAll(linkRegex);
    const matchArr = []
    for (const match of matches) {
      matchArr.push(match)
    }
    return matchArr
  }

  /**
   * Splits a given text into an array of objects, where each object represents a segment of the text.
   *
   * @param {string} text - The text to be split.
   * @param {Array<Object>} arr - An array of objects, where each object contains a link and its index in the text.
   * @return {Array<Object>} An array of objects, where each object represents a segment of the text.
   */
  function splitText(text, arr) {
    if (!arr.length) return [{ text, type: 'text' }]
    let lastIndex = 0
    let returnArr = []
    arr.forEach((item, i) => {
      const link = item[0]
      const textObj = { text: text.slice(lastIndex, item.index), type: 'text' }
      const linkObj = { text: link, type: 'link' }
      returnArr.push(textObj, linkObj)
      lastIndex = item.index + link.length
      if (i === arr.length - 1 && lastIndex < text.length) {
        returnArr.push({ text: text.slice(lastIndex), type: 'text' })
      }
    })
    return returnArr
  }

  // 根据链接地址创建a标签
  function createLink(link) {
    const a = document.createElement("a");
    a.href = link;
    a.textContent = link;
    a.target = "_blank"; // 可选：在新标签页打开链接
    a.rel = 'noopener noreferrer nofollow'
    return a;
  }

  // 根据文字创建文本标签
  function createTextNode(text) {
    const textNode = document.createTextNode(text);
    return textNode;
  }

  // 根据类型返回不同的创建标签方法
  function createNode(type, text) {
    switch (type) {
      case 'link':
        return createLink(text);
      case 'text':
        return createTextNode(text);
      default:
        throw new Error('Invalid type');
    }
  }

  /*
{
  match: {
      node:[]
  }
}
*/
  function createTextNodeTree(matchObj = {}, node, parent) {
    if (node.nodeType === 3 && parent.nodeName !== "A") {
      const textContent = node.textContent;
      let matches = getTextLinks(textContent)
      matches.forEach((match) => {
        if (matchObj[match] && matchObj[match].length > 0) {
          matchObj[match].push(node)
        } else {
          matchObj[match] = [node]
        }
      });
    }

    if (node.shadowRoot) {
      const shadowRoot = node.shadowRoot
      for (const shadowRootChild of shadowRoot.childNodes) {
        createTextNodeTree(matchObj, shadowRootChild, shadowRoot)
      }
    }
    for (let child of node.childNodes) {
      createTextNodeTree(matchObj, child, node)
    }

    return matchObj;
  }
  function callback(mutationsList, observer) {
    if (lastExecutionTime + delay < Date.now()) {
      const matchObj = createTextNodeTree({}, document.body, null);
      for (const match in matchObj) {
        if (Object.hasOwnProperty.call(matchObj, match)) {
          const nodeList = removeDuplicates(matchObj[match]);
          nodeList.forEach((node) => {
            const generateNodeList = splitText(node.textContent, getTextLinksList(node.textContent));
            traverseArrayBackward(generateNodeList, ({ type, text }, i, isLast) => {
              try {
                isLast ? node.parentNode.replaceChild(createNode(type, text), node) :
                  node.nextSibling ?
                    node.parentNode.insertBefore(createNode(type, text), node.nextSibling) :
                    node.parentNode.appendChild(createNode(type, text));
              } catch (error) { }
            })
          })
        }
      }
      lastExecutionTime = Date.now();
    }
  }

  let observer = new MutationObserver(callback);

  let delay = 500; // 间隔时间，单位毫秒
  let lastExecutionTime = 0;

  observer.observe(document.body, { childList: true, attributes: true });
})();