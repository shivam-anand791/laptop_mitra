ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_orderId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_orderItemId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_mergedIntoId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_ticketId_fkey";
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_ticketId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_returnRequestId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_messageId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketEvent" DROP CONSTRAINT "TicketEvent_ticketId_fkey";
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" DROP CONSTRAINT "ReturnRequest_ticketId_fkey";
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReturnItem" DROP CONSTRAINT "ReturnItem_returnRequestId_fkey";
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiscountRedemption" DROP CONSTRAINT "DiscountRedemption_orderId_fkey";
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReferralRedemption" DROP CONSTRAINT "ReferralRedemption_orderId_fkey";
ALTER TABLE "ReferralRedemption" ADD CONSTRAINT "ReferralRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AffiliatePaymentDetails" DROP CONSTRAINT "AffiliatePaymentDetails_userId_fkey";
ALTER TABLE "AffiliatePaymentDetails" ADD CONSTRAINT "AffiliatePaymentDetails_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HelpArticle" DROP CONSTRAINT "HelpArticle_categoryId_fkey";
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_append_only_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "TicketEvent_append_only"
  BEFORE UPDATE OR DELETE ON "TicketEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_history_mutation();

CREATE TRIGGER "AuditLog_append_only"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_history_mutation();
