import React, { useState } from "react";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Button from "@material-ui/core/Button";
import Ledger from "@daml/ledger";
import { useStreamQuery, useLedger, useParty } from "@daml/react";
import { ContractId } from "@daml/types";
import { Offer, Accept, PaymentSession, Receipt } from "@daml.js/stripe-0.0.1/lib/Stripe/Payment";
import { InputDialog, InputDialogProps } from "./InputDialog";
import useStyles from "./styles";
import { loadStripe, Stripe } from '@stripe/stripe-js'

export default function Payment() {
  const classes = useStyles();
  const party = useParty();
  const ledger : Ledger = useLedger();
  const offers = useStreamQuery(Offer).contracts;
  const paymentSessions = useStreamQuery(PaymentSession).contracts;
  const receipts = useStreamQuery(Receipt).contracts;

  type LoadedStripe = {
    pk: string|null;
    promise: Promise<Stripe|null>|null;
  };
  const defaultStripePromise: LoadedStripe = {pk: null, promise: null};
  const [loadedStripe, setLoadedStripe] = useState(defaultStripePromise);

  function resetStripe(pk: string) {
    if (!loadedStripe || !loadedStripe.pk || loadedStripe.pk != pk) {
      setLoadedStripe({
        pk: pk,
        promise: loadStripe(pk)
      });
    }
  }

  offers.forEach(offer => resetStripe(offer.payload.pk));

  async function stripeCheckout(session: PaymentSession.CreateEvent) {
    const stripe = await loadedStripe.promise;
    if (!stripe) return;
    const {error} = await stripe.redirectToCheckout({sessionId: session.payload.paymentSessionId});
  }

  paymentSessions.forEach(session => {
    resetStripe(session.payload.pk);
    if (party == session.payload.buyer){
      stripeCheckout(session);
    }
  });

  async function justAccept(offer: Offer.CreateEvent) {
    await ledger.exercise(Offer.Accept, offer.contractId, {});
  }

  return (
    <>
      <h1>PublicKey</h1>
      {!loadedStripe.pk ? "Null" : loadedStripe.pk}
      <h1>Offers</h1>
      <Table size="small">
        <TableHead>
          <TableRow className={classes.tableRow}>
            <TableCell key={0} className={classes.tableCell}>Seller</TableCell>
            <TableCell key={1} className={classes.tableCell}>Buyer</TableCell>
            <TableCell key={2} className={classes.tableCell}>Items</TableCell>
            <TableCell key={3} className={classes.tableCell}>Accept</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {offers.map(o => (
            <TableRow key={o.contractId} className={classes.tableRow}>
              <TableCell key={0} className={classes.tableCell}>{o.payload.seller}</TableCell>
              <TableCell key={1} className={classes.tableCell}>{o.payload.buyer}</TableCell>
              <TableCell key={2} className={classes.tableCell}>{o.payload.items.length}</TableCell>
              <TableCell key={3} className={classes.tableCellButton}>
                <Button color="primary" size="small" className={classes.choiceButton} variant="contained" disabled={o.payload.buyer !== party} onClick={() => justAccept(o)}>Accept!</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h1>PaymentSessions</h1>
      <Table size="small">
        <TableHead>
          <TableRow className={classes.tableRow}>
            <TableCell key={0} className={classes.tableCell}>Seller</TableCell>
            <TableCell key={1} className={classes.tableCell}>Buyer</TableCell>
            <TableCell key={2} className={classes.tableCell}>Items</TableCell>
            <TableCell key={3} className={classes.tableCell}>PaymentSession.id</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paymentSessions.map(s => (
            <TableRow key={s.contractId} className={classes.tableRow}>
              <TableCell key={0} className={classes.tableCell}>{s.payload.seller}</TableCell>
              <TableCell key={1} className={classes.tableCell}>{s.payload.buyer}</TableCell>
              <TableCell key={2} className={classes.tableCell}>{s.payload.items.length}</TableCell>
              <TableCell key={3} className={classes.tableCell}>{s.payload.paymentSessionId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h1>Receipts</h1>
      <Table size="small">
        <TableHead>
          <TableRow className={classes.tableRow}>
            <TableCell key={0} className={classes.tableCell}>Seller</TableCell>
            <TableCell key={1} className={classes.tableCell}>Buyer</TableCell>
            <TableCell key={2} className={classes.tableCell}>Items</TableCell>
            <TableCell key={3} className={classes.tableCell}>PaymentSession.id</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {receipts.map(r => (
            <TableRow key={r.contractId} className={classes.tableRow}>
              <TableCell key={0} className={classes.tableCell}>{r.payload.seller}</TableCell>
              <TableCell key={1} className={classes.tableCell}>{r.payload.buyer}</TableCell>
              <TableCell key={2} className={classes.tableCell}>{r.payload.items.length}</TableCell>
              <TableCell key={3} className={classes.tableCell}>{r.payload.paymentSessionId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}