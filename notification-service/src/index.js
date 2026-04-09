const stompit = require('stompit');

const ACTIVEMQ_URL = process.env.ACTIVEMQ_URL || 'tcp://activemq:61616';
const ORDER_QUEUE = process.env.ORDER_QUEUE || 'order.queue';
const ACTIVEMQ_RETRY_DELAY_MS = Number(process.env.ACTIVEMQ_RETRY_DELAY_MS || 5000);

function parseBrokerUrl(url) {
  try {
    const parsed = new URL(url);
    const basePort = Number(parsed.port || 61616);
    const ports = basePort === 61616 ? [61616, 61613] : [basePort];

    return {
      host: parsed.hostname,
      ports,
      connectHeaders: {
        host: '/',
        login: parsed.username || 'admin',
        passcode: parsed.password || 'admin',
      },
    };
  } catch {
    return {
      host: 'activemq',
      ports: [61616, 61613],
      connectHeaders: {
        host: '/',
        login: 'admin',
        passcode: 'admin',
      },
    };
  }
}

const stompConnectOptions = parseBrokerUrl(ACTIVEMQ_URL);

function startConsumer() {
  const ports = [...stompConnectOptions.ports];

  const tryPort = () => {
    const port = ports.shift();

    if (!port) {
      setTimeout(startConsumer, ACTIVEMQ_RETRY_DELAY_MS);
      return;
    }

    stompit.connect({
      host: stompConnectOptions.host,
      port,
      connectHeaders: stompConnectOptions.connectHeaders,
    }, (error, client) => {
      if (error) {
        console.error(`Notification service failed to connect on port ${port}. Retrying...`, error.message);
        tryPort();
        return;
      }

      const subscribeHeaders = {
        destination: `/queue/${ORDER_QUEUE}`,
        ack: 'auto',
      };

      client.subscribe(subscribeHeaders, (subscribeError, message) => {
        if (subscribeError) {
          console.error('Subscription error. Restarting consumer...', subscribeError.message);
          client.disconnect();
          setTimeout(startConsumer, ACTIVEMQ_RETRY_DELAY_MS);
          return;
        }

        message.readString('utf-8', (readError, body) => {
          if (readError) {
            console.error('Message read error:', readError.message);
            return;
          }

          try {
            const payload = JSON.parse(body);
            console.log('Message received from ActiveMQ');
            console.log(`Received ORDER_PLACED for Order ID: ${payload.orderId}`);
          } catch (parseError) {
            console.error('Invalid JSON message:', parseError.message);
          }
        });
      });

      client.on('error', (clientError) => {
        console.error('ActiveMQ client error. Reconnecting...', clientError.message);
        setTimeout(startConsumer, ACTIVEMQ_RETRY_DELAY_MS);
      });

      console.log('Notification service listening on order.queue');
    });
  };

  tryPort();
}

startConsumer();
