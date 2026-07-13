/**
 * Synchronous application event bus.
 *
 * Storage contract: Map<string, Set<Function>>.
 * Publishing uses a listener snapshot so subscriptions may safely detach while
 * an event is being dispatched.
 */
class EventBusContract {
  #topics = new Map();

  subscribe(topic, callback) {
    assertTopic(topic);
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.subscribe callback must be a function.');
    }

    const listeners = this.#topics.get(topic) ?? new Set();
    listeners.add(callback);
    this.#topics.set(topic, listeners);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;

      listeners.delete(callback);
      if (listeners.size === 0) {
        this.#topics.delete(topic);
      }
    };
  }

  publish(topic, payload) {
    assertTopic(topic);
    const listeners = this.#topics.get(topic);
    if (!listeners) return;

    [...listeners].forEach((callback) => callback(payload));
  }

  listenerCount(topic) {
    assertTopic(topic);
    return this.#topics.get(topic)?.size ?? 0;
  }
}

function assertTopic(topic) {
  if (typeof topic !== 'string' || topic.trim() === '') {
    throw new TypeError('EventBus topic must be a non-empty string.');
  }
}

export const EventBus = Object.freeze(new EventBusContract());
