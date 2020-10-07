# Copyright (c) 2020, Digital Asset (Switzerland) GmbH and/or its affiliates.
# SPDX-License-Identifier: Apache-2.0

import asyncio
import logging

from dataclasses import dataclass
from datetime import datetime

from aiohttp import ClientSession

from dazl import create_and_exercise, exercise, exercise_by_key
from dazl.model.core import ContractData

from daml_dit_api import \
    IntegrationEnvironment, IntegrationEvents, IntegrationWebhookResponse, is_true

import stripe

LOG = logging.getLogger('integration')

async def create_native_session(price_ids, secret_key, success_url, cancel_url):
    stripe.api_key = secret_key
    stripe_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[dict(price=id, quantity=1) for id in price_ids ],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True # TODO: parameterize this
    )
    if stripe_session: 
        return dict( 
            success = True,
            paymentSessionId = stripe_session.id,
            intentId = stripe_session.payment_intent)
    else:
        return dict(
            success = False,
            httpStatusCode = "401",
            httpResponseBody = "Missing session"
        )

def integration_stripe_checkout_main(
        env: 'IntegrationEnvironment',
        events: 'IntegrationEvents'):

    seller_secret_key = None

    @events.ledger.contract_created('Stripe.Seller:SellerSecretKey')
    async def on_contract_created(event):
        LOG.info('Created Seller.SellerSecretKey')

        nonlocal seller_secret_key 
        seller_secret_key = event.cdata

    @events.ledger.contract_created('Stripe.Payment:Bill')
    async def on_agreement_to_pay_created(bill):
        nonlocal seller_secret_key
        LOG.info('on_contract_created: %r', bill) 
        price_ids = [i['_2'] for i in bill.cdata['items']]
        secret_key = seller_secret_key['sk']
        success_url = bill.cdata['successUrl']
        cancel_url = bill.cdata['cancelUrl']

        if seller_secret_key:
            resp = await create_native_session(price_ids, secret_key, success_url, cancel_url)

            if resp['success']: 
                del resp['success']
                return exercise(bill.cid, 'StartSession', resp)
            else:
                LOG.error("Invalid Session create response (status: %r, body: %r",
                            resp['httpStatusCode'], resp['httpResponseBody'])
                del resp['success']
                return exercise(bill.cid, 'FailStartSession', resp)
        else: 
                return exercise(bill.cid, 'DeclareNotReady', {})

def integration_stripe_checkout_webhook_main(
        env: 'IntegrationEnvironment',
        events: 'IntegrationEvents'):
    
    @events.webhook.post(label="Stripe Checkout Webhook Endpoint")
    async def on_webhook_post(request):
        LOG.info('on webhook received: %r', request)
        json = await request.json()
        LOG.info('Processing %r', json)

        if json['type'] == 'checkout.session.completed':
            payment_session_id = json['data']['object']['id']

            cmd = exercise_by_key(
                'Stripe.Payment.PaymentSession',
                dict(_1=env.party, _2=payment_session_id),
                'Succeed',
                {})
            return IntegrationWebhookResponse([cmd])
        else:
            LOG.info('Not a checkout.session.completed')
            return IntegrationWebhookResponse()