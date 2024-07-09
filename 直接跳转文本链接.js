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

  function removeDuplicates(arr) {
    return arr.filter((item, index, self) => self.indexOf(item) === index);
  }

  /*
{
  match: {
      node:[]
  }
}
*/
  function createTextNodeTree(matchObj = {}, node, parent) {
    // 使用正则表达式匹配链接
    var linkRegex = /http[s]?:\/\/[^\s\/$.?#].[^\s]*/g;
    if (node.nodeType === 3 && parent.nodeName !== "A") {
      const textContent = node.textContent;
      let matches = textContent && textContent.match(linkRegex);
      matches &&
        matches.forEach((match) => {
          if (matchObj[match] && matchObj[match].length > 0) {
            matchObj[match].push(node)
          } else {
            matchObj[match] = [node]
          }
        });
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
            var a = document.createElement("a");
            a.href = match;
            a.target = "_blank"; // 可选：在新标签页打开链接
            a.rel = 'noopener noreferrer nofollow'
            a.textContent = match;
            // 创建一个包裹元素，用于放置链接（可选，如果不需要额外样式或处理，可以直接替换原文本节点）
            var wrapper = document.createElement("span");
            wrapper.appendChild(a);
            // 替换原文本节点为包裹元素（或直接将链接插入到文本节点中）
            // 注意：直接替换文本节点可能会导致样式或布局问题，因此建议使用包裹元素
            try {
              const fullText = node.textContent.trim()
              const index = fullText.indexOf(match)
              const beforeText = index !== 0 ? fullText.substring(0, index) : ''
              const afterText = index + match.length < fullText.length ? fullText.substring(index + match.length) : ''

              let beforeTextNode = beforeText && document.createTextNode(beforeText);
              let afterTextNode = afterText && document.createTextNode(afterText);
              beforeTextNode && node.parentNode.insertBefore(beforeTextNode, node)
              // 修改appendChild为insertBefore，解决插入位置问题，如果当前节点有兄弟节点，就插兄弟节点前面，没有就插最后面
              afterTextNode && node.nextSibling ? node.parentNode.insertBefore(afterTextNode, node.nextSibling) : node.parentNode.appendChild(afterTextNode)

              node.parentNode.replaceChild(wrapper, node);
            } catch (error) { }
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