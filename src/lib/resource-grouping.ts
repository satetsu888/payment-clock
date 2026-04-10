import type { TestClockResources, CustomerWithResources, ResourceItem, StripeEvent, Operation } from "./types";

function getCustomerId(resource: ResourceItem): string | null {
  const customer = resource.data.customer;
  if (typeof customer === "string") return customer;
  if (typeof customer === "object" && customer !== null && "id" in (customer as Record<string, unknown>)) {
    return String((customer as Record<string, unknown>).id);
  }
  return null;
}

export function groupResourcesByCustomer(resources: TestClockResources): CustomerWithResources[] {
  const groups: CustomerWithResources[] = resources.customers.map((customer) => ({
    customer,
    subscriptions: [],
    invoices: [],
    paymentIntents: [],
  }));

  const customerIndex = new Map(groups.map((g) => [g.customer.stripeId, g]));

  for (const sub of resources.subscriptions) {
    const cid = getCustomerId(sub);
    if (cid && customerIndex.has(cid)) {
      customerIndex.get(cid)!.subscriptions.push(sub);
    }
  }

  for (const inv of resources.invoices) {
    const cid = getCustomerId(inv);
    if (cid && customerIndex.has(cid)) {
      customerIndex.get(cid)!.invoices.push(inv);
    }
  }

  for (const pi of resources.paymentIntents) {
    const cid = getCustomerId(pi);
    if (cid && customerIndex.has(cid)) {
      customerIndex.get(cid)!.paymentIntents.push(pi);
    }
  }

  return groups;
}

export function extractCustomerIdFromOperation(op: Operation): string | null {
  // create_customer: responseSummary contains the customer ID (e.g. "cus_xxx")
  if (op.operationType === "create_customer" && op.responseSummary) {
    return op.responseSummary;
  }

  // attach_payment_method, set_default_payment_method, detach_payment_method, create_subscription:
  // requestParams contains {"customer_id": "cus_xxx", ...}
  if (op.requestParams) {
    try {
      const params = JSON.parse(op.requestParams);
      if (typeof params.customer_id === "string") return params.customer_id;
    } catch {
      // ignore
    }
  }

  return null;
}

export function extractCustomerIdFromEvent(event: StripeEvent): string | null {
  try {
    const snapshot = JSON.parse(event.dataSnapshot);
    const obj = snapshot?.data?.object;
    if (!obj) return null;

    // customer.* events: the object itself is the customer
    if (event.eventType.startsWith("customer.") && !event.eventType.startsWith("customer.subscription.") && !event.eventType.startsWith("customer.discount.") && !event.eventType.startsWith("customer.source.") && !event.eventType.startsWith("customer.tax_id.")) {
      if (obj.object === "customer" && typeof obj.id === "string") {
        return obj.id;
      }
    }

    // Most resource events have a `customer` field
    if (typeof obj.customer === "string") return obj.customer;

    return null;
  } catch {
    return null;
  }
}
