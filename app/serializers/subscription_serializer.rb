class SubscriptionSerializer
  include FastJsonapi::ObjectSerializer
  attributes :id, :plan, :users_count, :invoice_upcoming_total, :canceled

  attribute :active do |object|
    object.stripe_status == 'active'
  end

  attribute :renews_or_cancels_on do |object|
    (object.stripe_current_period_end + 1.day).strftime('%Y-%m-%d')
  end
end
