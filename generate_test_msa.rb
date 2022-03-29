#!/usr/bin/env ruby
size = ARGV[0].to_i
chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-"

random_seqs = []
(0..100).each do |y|
  if y % 10 == 0 then
    STDERR.puts(y)
  end
  seq = ""
  size.times {
    seq += chars[rand(chars.length)]
  }
  random_seqs.append(seq)
end

(0..size).each do |y|
  if y % 10 == 0 then
    STDERR.puts(y)
  end
  puts ">#{y}"
  puts "#{random_seqs[rand(random_seqs.length)]}"
end
