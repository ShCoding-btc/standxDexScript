import 'dotenv/config';
import axios from 'axios';
import { tradingConfig } from '../config.js';

/**
 * 检查并添加关键词到消息内容
 * @param {string} content - 原始消息内容
 * @returns {string} - 添加关键词后的消息内容
 */
function addKeywordIfNeeded(content) {
  const keyword = tradingConfig.dingTalk?.keyword;
  
  if (!keyword || keyword.trim() === '') {
    // 如果未配置关键词，直接返回原内容
    return content;
  }
  
  // 分割多个关键词（支持逗号分隔）
  const keywords = keyword.split(',').map(k => k.trim()).filter(k => k);
  
  // 检查消息中是否已包含任一关键词
  const hasKeyword = keywords.some(k => content.includes(k));
  
  if (hasKeyword) {
    // 如果已包含关键词，直接返回原内容
    return content;
  }
  
  // 如果未包含关键词，在消息开头添加第一个关键词
  return `${keywords[0]} ${content}`;
}

/**
 * 发送钉钉机器人消息
 * @param {string} content - 消息内容（会自动添加配置的关键词）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function sendDingTalkMsg(content) {
  const webhook = process.env.DINGTALK_WEBHOOK;
  
  if (!webhook) {
    console.error('未配置钉钉Webhook地址，请在.env文件中设置DINGTALK_WEBHOOK');
    return {
      success: false,
      message: '未配置钉钉Webhook地址'
    };
  }

  if (!content || content.trim() === '') {
    console.error('消息内容不能为空');
    return {
      success: false,
      message: '消息内容不能为空'
    };
  }

  // 自动添加关键词（如果配置了的话）
  const finalContent = addKeywordIfNeeded(content);

  const payload = {
    "msgtype": "text",
    "text": {
      "content": finalContent
    }
  };

  try {
    const response = await axios.post(webhook, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.data.errcode === 0) {
      console.log("钉钉消息推送成功！");
      return {
        success: true,
        message: '消息推送成功'
      };
    } else {
      console.error("钉钉推送失败：", response.data.errmsg);
      return {
        success: false,
        message: response.data.errmsg || '推送失败'
      };
    }
  } catch (error) {
    console.error("钉钉推送网络异常：", error.message);
    return {
      success: false,
      message: error.message || '网络异常'
    };
  }
}

/**
 * 发送钉钉Markdown格式消息
 * @param {string} title - 消息标题
 * @param {string} text - Markdown格式的消息内容（会自动添加配置的关键词）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function sendDingTalkMarkdown(title, text) {
  const webhook = process.env.DINGTALK_WEBHOOK;
  
  if (!webhook) {
    console.error('未配置钉钉Webhook地址，请在.env文件中设置DINGTALK_WEBHOOK');
    return {
      success: false,
      message: '未配置钉钉Webhook地址'
    };
  }

  if (!title || !text) {
    console.error('标题和内容不能为空');
    return {
      success: false,
      message: '标题和内容不能为空'
    };
  }

  // 自动添加关键词到Markdown内容（如果配置了的话）
  const finalText = addKeywordIfNeeded(text);

  const payload = {
    "msgtype": "markdown",
    "markdown": {
      "title": title,
      "text": finalText
    }
  };

  try {
    const response = await axios.post(webhook, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.data.errcode === 0) {
      console.log("钉钉Markdown消息推送成功！");
      return {
        success: true,
        message: '消息推送成功'
      };
    } else {
      console.error("钉钉推送失败：", response.data.errmsg);
      return {
        success: false,
        message: response.data.errmsg || '推送失败'
      };
    }
  } catch (error) {
    console.error("钉钉推送网络异常：", error.message);
    return {
      success: false,
      message: error.message || '网络异常'
    };
  }
}
