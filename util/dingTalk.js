import 'dotenv/config';
import axios from 'axios';

/**
 * 发送钉钉机器人消息
 * @param {string} content - 消息内容（必须包含你设置的关键词）
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

  const payload = {
    "msgtype": "text",
    "text": {
      "content": content
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
 * @param {string} text - Markdown格式的消息内容
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

  const payload = {
    "msgtype": "markdown",
    "markdown": {
      "title": title,
      "text": text
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
